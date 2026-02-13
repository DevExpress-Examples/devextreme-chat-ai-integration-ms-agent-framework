import { ref } from 'vue';
import { ArrayStore, DataSource } from 'devextreme-vue/common/data';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { loadMessages } from 'devextreme/localization';
import type { DxChatTypes } from 'devextreme-vue/chat';
import type { DxFileUploaderTypes } from 'devextreme-vue/file-uploader';
import notify from 'devextreme/ui/notify';

const ALERT_TIMEOUT = 10000;
const CHAT_SERVER_URL = 'http://localhost:5005/api/Chat';
const assistant: DxChatTypes.User = { id: 'assistant', name: 'Virtual Assistant' };
const REGENERATION_TEXT = 'Regeneration...';

interface MessageAuthor {
    id?: string | number | undefined;
    name?: string;
}

interface Message {
    id?: string | number | undefined;
    text?: string;
    timestamp?: string | number | Date | undefined;
    author?: MessageAuthor;
}

export function useChatLogic() {
    const dataSource = ref<DataSource | null>(null);
    const user = ref({ id: 'user' });
    const typingUsers = ref<Array<DxChatTypes.User>>([]);
    const alerts = ref<Array<DxChatTypes.Alert>>([]);
    const regenerationText = ref(REGENERATION_TEXT);
    const copyButtonIcon = ref('copy');
    const isDisabled = ref(false);
    const attachedFiles = ref<File[]>([]);
    const allowedFileExtensions = ref(['.jpg', '.jpeg', '.png']);

    const loadMessage = () => {
        loadMessages({
            en: {
                'dxChat-emptyListMessage': 'Chat is Empty',
                'dxChat-emptyListPrompt': 'AI Assistant is ready to answer your questions.',
                'dxChat-textareaPlaceholder': 'Ask AI Assistant...'
            }
        });
    };

    function onFileUploaderValueChanged(e: DxFileUploaderTypes.ValueChangedEvent) {
        attachedFiles.value = e.value ?? [];
    }

    function toggleDropZoneActive(dropZone: HTMLElement, isActive: boolean) {
        dropZone.classList.toggle('dropzone-active', isActive);
    }

    function uploadFile() {
        toggleDropZoneActive(document.getElementById('chat')!, false);
    }

    function onDropZoneEnter({ component, dropZoneElement, event }: DxFileUploaderTypes.DropZoneEnterEvent) {
        if (dropZoneElement.id === 'chat') {
            const items = (event!.originalEvent as DragEvent).dataTransfer?.items ?? [];
            const allowedFileExtensions = component.option('allowedFileExtensions') ?? [];
            const isValidFileExtension = Array.from(items).every(i => allowedFileExtensions.includes(`.${i.type.replace(/^image\//, '')}`));

            if (isValidFileExtension) {
                toggleDropZoneActive(dropZoneElement, true);
            }
        }
    }

    function onDropZoneLeave({ dropZoneElement }: DxFileUploaderTypes.DropZoneLeaveEvent) {
        if (dropZoneElement.id === 'chat') {
            toggleDropZoneActive(dropZoneElement, false);
        }
    }

    async function getInitialMessages() {
        try {
            const response = await fetch(`${CHAT_SERVER_URL}/GetUserMessages`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) {
                notify('Failed to fetch initial messages', 'error', 1000);
                return [];
            }
            return await response.json();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            notify(`Error fetching initial messages: ${errorMessage}`, 'error', 1000);
            return [];
        }
    }

    const initDataSource = async () => {
        let messages = await getInitialMessages();
        let arrayStore = new ArrayStore({
            key: 'id',
            data: messages,
        });

        dataSource.value = new DataSource({
            store: arrayStore,
            paginate: false,
        });
    };

    const getAIResponse = async (message: Message, shouldRegenerate = false) => {
        const formData = objectToFormData({ ...message, attachedFiles: attachedFiles.value });
        const response = await fetch(
            `${CHAT_SERVER_URL}/GetAIResponse?regenerate=${shouldRegenerate}`,
            {
                method: 'POST',
                credentials: 'include',
                body: formData,
            },
        );
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get AI response ${errorText}`);
        }
        return response.json();
    };

    const updateLastMessage = (message?: Message | null) => {
        const items = dataSource.value?.items();
        const lastMessage = items?.slice(-1)[0];
        const text = {
            text: message ? message?.text : REGENERATION_TEXT,
        };

        dataSource.value?.store().push([{ type: 'remove', key: lastMessage.id }, {
            type: 'insert',
            data: { ...lastMessage, ...text },
        }]);
    };

    const alertLimitReached = (error: any) => {
        setAlerts([{ message: error.message }]);
        setTimeout(() => setAlerts([]), ALERT_TIMEOUT);
    };

    const setAlerts = (newAlerts: DxChatTypes.Alert[]) => {
        alerts.value = newAlerts;
    };

    const regenerate = async () => {
        let items = dataSource.value?.items();
        let lastMessage = items?.slice(-1)[0];
        try {
            const aiResponse = await getAIResponse(lastMessage, true);
            updateLastMessage(aiResponse);
        } catch (error) {
            if (lastMessage) {
                updateLastMessage(lastMessage);
            }
            alertLimitReached(error);
        }
    };

    const convertToHtml = (message: { text: string }) => {
        return unified()
            .use(remarkParse)
            .use(remarkRehype)
            .use(rehypeStringify)
            .processSync(message.text || '')
            .toString();
    };

    const toggleDisabledState = (disabled: boolean, event?: { target?: EventTarget } | undefined) => {
        const element = event?.target as HTMLElement;
        isDisabled.value = disabled;

        if (element) {
            if (disabled) {
                element.blur();
            } else {
                element.focus();
            }
        }
    };

    const onMessageEntered = async (e: DxChatTypes.MessageEnteredEvent) => {
        let { message, event } = e;
        toggleDisabledState(true);
        (event?.target as HTMLElement).blur();
        if (alerts.value.length) return;

        message.id = Date.now().toString();
        if (!message.timestamp) {
            message.timestamp = new Date().toISOString();
        }
        dataSource.value?.store().push([{ type: 'insert', data: message }]);
        typingUsers.value = [assistant];

        try {
            const aiMessage = await getAIResponse(message);
            setTimeout(() => {
                typingUsers.value = [];
                dataSource.value?.store().push([{ type: 'insert', data: aiMessage }]);
            }, 500);
        } catch (err) {
            (event?.target as HTMLElement).focus();
            typingUsers.value = [];
            alertLimitReached(err);
        } finally {
            (event?.target as HTMLElement).focus();
            toggleDisabledState(false);
        }
    };

    const onCopyButtonClick = (message: { text: string }) => {
        navigator.clipboard?.writeText(message.text ?? '');
        copyButtonIcon.value = 'check';
        setTimeout(() => copyButtonIcon.value = 'copy', 2500);
    };

    const onRegenerateButtonClick = async () => {
        updateLastMessage();
        toggleDisabledState(true);
        try {
            await regenerate();
        } finally {
            toggleDisabledState(false);
        }
    };

    function objectToFormData(obj: any, form?: FormData, namespace?: string) {
        const formData = form || new FormData();

        if (obj && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof File)) {
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                const formKey = namespace ? `${namespace}[${key}]` : key;

                if (key === 'attachedFiles') {
                    value.forEach((file: any, index: any) => {
                        formData.append(`files`, value[index]);
                    });
                } else if (value instanceof Date) {
                    formData.append(formKey, value.toISOString());
                } else if (value instanceof File || value instanceof Blob) {
                    formData.append(formKey, value);
                } else if (Array.isArray(value)) {
                    value.forEach((element, index) => {
                        const tempKey = `${formKey}[${index}]`;
                        if (typeof element === 'object') {
                            objectToFormData(element, formData, tempKey);
                        } else {
                            formData.append(tempKey, element);
                        }
                    });
                } else if (typeof value === 'object' && value !== null) {
                    objectToFormData(value, formData, formKey);
                } else if (value !== undefined && value !== null) {
                    formData.append(formKey, value);
                }
            });
        }
        return formData;
    }

    return {
        dataSource,
        user,
        typingUsers,
        alerts,
        regenerationText,
        copyButtonIcon,
        loadMessage,
        initDataSource,
        convertToHtml,
        onMessageEntered,
        onCopyButtonClick,
        onRegenerateButtonClick,
        isDisabled,
        uploadFile,
        onFileUploaderValueChanged,
        allowedFileExtensions,
        onDropZoneEnter,
        onDropZoneLeave,
    };
}
