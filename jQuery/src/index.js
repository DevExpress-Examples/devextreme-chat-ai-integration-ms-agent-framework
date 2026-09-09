$(() => {
  const CHAT_SERVER_URL = 'http://localhost:5005/api/Chat';
  const CHAT_DISABLED_CLASS = 'chat-disabled';
  const CHAT_MESSAGE_BUBBLE_CLASS = 'dx-chat-messagebubble-text';
  const CHAT_BUBBLE_BUTTON_CLASS = 'dx-bubble-button-container';
  const ALERT_TIMEOUT = 1000 * 60;
  const REGENERATION_TEXT = 'Regeneration...';

  const assistant = {
    id: 'assistant',
    name: 'Virtual Assistant',
  };

  const currentUser = {
    id: 'user',
  };

  let attachedFiles = [];

  DevExpress.localization.loadMessages({
    en: {
      'dxChat-emptyListMessage': 'Chat is Empty',
      'dxChat-emptyListPrompt': 'AI Assistant is ready to answer your questions.',
      'dxChat-textareaPlaceholder': 'Ask AI Assistant...',
    },
  });

  // Initialize Chat component
  $('#chat').dxChat({
    user: currentUser,
    height: 600,
    width: 800,
    reloadOnChange: false,
    showAvatar: false,
    showDayHeaders: false,
    messageTemplate,
    onMessageEntered,
    onInitialized,
    fileUploaderOptions: {
      uploadFile: () => toggleDropZoneActive(document.getElementById('chat'), false),
      onValueChanged: onFileUploaderValueChanged,
      uploadedMessage: 'File attached',
      allowedFileExtensions: ['.jpg', '.jpeg', '.png'],
      dropZone: '#chat',
      onDropZoneEnter({ component, dropZoneElement, event }) {
        if (dropZoneElement.id === 'chat') {
          const items = event.originalEvent.dataTransfer.items;
          const allowedFileExtensions = component.option('allowedFileExtensions');
          const isValidFileExtension = [...items].every(i => allowedFileExtensions.includes(`.${i.type.replace(/^image\//, '')}`));

          if (isValidFileExtension) {
            toggleDropZoneActive(dropZoneElement, true);
          }
        }
      },
      onDropZoneLeave({ dropZoneElement}) {
        if (dropZoneElement.id === 'chat') {
          toggleDropZoneActive(dropZoneElement, false);
        }
      }
    },
  });

  function toggleDropZoneActive(dropZone, isActive) {
    dropZone.classList.toggle('dropzone-active', isActive);
  }

  function onFileUploaderValueChanged({ value }) {
    attachedFiles = value;
  }

  async function onInitialized({ component }) {
    const messages = await getInitialMessages();
    component.option('dataSource', new DevExpress.data.DataSource({
      store: new DevExpress.data.ArrayStore({
        key: 'id',
        data: messages,
      }),
      paginate: false,
    }));
  }

  async function getInitialMessages() {
    const response = await fetch(`${CHAT_SERVER_URL}/GetUserMessages`, {
      method: 'GET',
      credentials: 'include',
    });
    return await response.json();
  }

  async function getAIResponse(message, regenerate = false) {
    const formData = objectToFormData({
      ...message,
      attachedFiles,
    });

    const response = await fetch(`${CHAT_SERVER_URL}/GetAIResponse?regenerate=${regenerate}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      throw response;
    }
    return await response.json();
  }

  async function onMessageEntered(e) {
    const { component, message, event } = e;

    component.option('alerts', []);

    message.id = Date.now().toString();

    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    component.renderMessage(message);
    toggleDisabledState(component, true, event);
    component.option('typingUsers', [assistant]);

    try {
      const aiMessage = await getAIResponse(message);
      setTimeout(() => {
        component.option('typingUsers', []);
        const dataSource = component.getDataSource();
        dataSource.store().push([{ type: 'insert', data: aiMessage }]);
      }, 200);
    } catch (err) {
      component.option('typingUsers', []);
      alertError(component, await getErrorMessage(err));
    } finally {
      toggleDisabledState(component, false, event);
    }
  }

  function toggleDisabledState(chat, disabled, event) {
    chat.element().toggleClass(CHAT_DISABLED_CLASS, disabled);

    if (disabled) {
      event?.target.blur();
    } else {
      event?.target.focus();
    }
  }

  async function getErrorMessage(err) {
    if (err instanceof Response) {
      let errorText = await err.text();
      if (!errorText) errorText = err.statusText;
      return errorText;
    }
    if (typeof err === 'object' && err !== null) {
      if (typeof err.error?.message === 'string') return err.error.message;
      if (typeof err.message === 'string') return err.message;
    }
    if (typeof err === 'string') return err;
    return 'Unknown error';
  };

  function alertError(chat, message) {
    chat.option('alerts', [{
      message,
    }]);

    setTimeout(() => {
      chat.option('alerts', []);
    }, ALERT_TIMEOUT);
  }

  function convertToHtml(value) {
    const result = unified()
      /* eslint-disable spellcheck/spell-checker */
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeMinifyWhitespace)
      .use(rehypeStringify)
      /* eslint-enable spellcheck/spell-checker */
      .processSync(value)
      .toString();

    return result;
  }

  function onCopyButtonClick(component, text) {
    navigator.clipboard?.writeText(text);

    component.option('icon', 'check');

    setTimeout(() => {
      component.option('icon', 'copy');
    }, 2500);
  }

  async function regenerate(chat) {
    const dataSource = chat.getDataSource();
    const items = dataSource.items();
    const lastMessage = items.at(-1);
    toggleDisabledState(chat, true);
    try {
      const aiMessage = await getAIResponse(lastMessage, true);
      updateLastMessage(chat, aiMessage);
    } catch (err) {
      if (lastMessage) {
        updateLastMessage(chat, lastMessage);
      }
      alertError(chat, await getErrorMessage(err));
    } finally {
      toggleDisabledState(chat, false);
    }
  }

  function onRegenerateButtonClick(chat) {
    if (chat.option('alerts').length > 0) return;

    updateLastMessage(chat);
    regenerate(chat);
  }

  function updateLastMessage(chat, aiMessage) {
    const dataSource = chat.getDataSource();
    const items = dataSource.items();
    const lastMessage = items.at(-1);
    const text = aiMessage ? aiMessage.text : REGENERATION_TEXT;
    dataSource.store().push([{
      type: 'update',
      key: lastMessage.id,
      data: { text },
    }]);
  }

  function renderMessageContent(chat, message, element) {
    $('<div>')
      .addClass(CHAT_MESSAGE_BUBBLE_CLASS)
      .html(convertToHtml(message.text))
      .appendTo(element);

    const $buttonContainer = $('<div>')
      .addClass(CHAT_BUBBLE_BUTTON_CLASS);

    $('<div>').dxButton({
      icon: 'copy',
      stylingMode: 'text',
      hint: 'Copy',
      onClick: ({ component }) => {
        onCopyButtonClick(component, message.text);
      },
    }).appendTo($buttonContainer);

    $('<div>').dxButton({
      icon: 'refresh',
      stylingMode: 'text',
      hint: 'Regenerate',
      onClick: () => onRegenerateButtonClick(chat),
    }).appendTo($buttonContainer);

    $buttonContainer.appendTo(element);
  }

  function messageTemplate(data, element) {
    const { message, component } = data;

    if (message.text === REGENERATION_TEXT) {
      element.text(REGENERATION_TEXT);
      return;
    }

    renderMessageContent(component, message, element);
  }

  function objectToFormData(obj, form, namespace) {
    const formData = form || new FormData();

    if (obj && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof File)) {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const formKey = namespace ? `${namespace}[${key}]` : key;

        if (key === 'attachedFiles') {
          value.forEach((file, index) => {
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
});
