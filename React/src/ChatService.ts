import { type ChatTypes } from 'devextreme-react/chat';
import { DataSource, ArrayStore } from 'devextreme-react/common/data';
import { BehaviorSubject, Observable } from 'rxjs';
import notify from 'devextreme/ui/notify';
import {
  ALERT_TIMEOUT, assistant, CHAT_SERVER_URL, REGENERATION_TEXT,
} from './data';

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

class AppService {
  alerts: ChatTypes.Alert[] = [];

  arrayStore?: ArrayStore;

  dataSource?: DataSource;

  private readonly typingUsersSubject: BehaviorSubject<ChatTypes.User[]> = new BehaviorSubject<ChatTypes.User[]>([]);

  private readonly alertsSubject: BehaviorSubject<ChatTypes.Alert[]> = new BehaviorSubject<ChatTypes.Alert[]>([]);

  constructor() {
    this.typingUsersSubject.next([]);
    this.alertsSubject.next([]);
  }

  get typingUsers$(): Observable<ChatTypes.User[]> {
    return this.typingUsersSubject.asObservable();
  }

  get alerts$(): Observable<ChatTypes.Alert[]> {
    return this.alertsSubject.asObservable();
  }

  getDictionary(): object {
    return {
      en: {
        'dxChat-emptyListMessage': 'Chat is Empty',
        'dxChat-emptyListPrompt': 'AI Assistant is ready to answer your questions.',
        'dxChat-textareaPlaceholder': 'Ask AI Assistant...',
      },
    };
  }

  async getInitialMessages(): Promise<Message[]> {
    try {
      const response = await fetch(`${CHAT_SERVER_URL}/GetUserMessages`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        notify('Failed to fetch initial messages', 'error', 1000);
        return [];
      }
      return await response.json() as Message[];
    } catch (err: unknown) {
      const errorMessage = await this.getErrorMessage(err);
      notify(`Error fetching initial messages: ${errorMessage}`, 'error', 1000);
      return [];
    }
  }

  async initDataSource(): Promise<DataSource> {
    let messages = await this.getInitialMessages();
    this.arrayStore = new ArrayStore({
      key: 'id',
      data: messages,
    });

    this.dataSource = new DataSource({
      store: this.arrayStore,
      paginate: false,
    });
    return this.dataSource;
  }

  async getAIResponse(message: Message, shouldRegenerate = false, attachedFiles?: File[]): Promise<any> {
    const formData = this.objectToFormData({ ...message, attachedFiles: attachedFiles || [] });
    const response = await fetch(
      `${CHAT_SERVER_URL}/GetAIResponse?regenerate=${shouldRegenerate}`,
      {
        method: 'POST',
        credentials: 'include',
        body: formData,
      },
    );
    if (!response.ok) {
      throw response;
    }
    return response.json();
  }

  updateLastMessage(message: Message | null = null): void {
    const items = this.dataSource?.items();
    const lastMessage = items?.slice(-1)[0];
    const text = {
      text: message ? message?.text : REGENERATION_TEXT,
    };
    this.dataSource?.store().push([{ type: 'remove', key: lastMessage.id }, {
      type: 'insert',
      data: { ...lastMessage, ...text },
    }]);
  }

  async getErrorMessage(err: unknown): Promise<string> {
    if (err instanceof Response) {
      const errorText = await err.text();
      return errorText || err.statusText;
    }
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Unknown error';
  }

  alertError(message: string): void {
    this.setAlerts([
      {
        message,
      },
    ]);

    setTimeout((): void => {
      this.setAlerts([]);
    }, ALERT_TIMEOUT);
  }

  setAlerts(alerts: ChatTypes.Alert[]): void {
    this.alerts = alerts;
    this.alertsSubject.next(alerts);
  }

  async regenerate(): Promise<void> {
    this.setAlerts([]);
    let items = this.dataSource?.items();
    let lastMessage = items?.slice(-1)[0];
    try {
      const aiResponse = await this.getAIResponse(lastMessage, true);
      this.updateLastMessage(aiResponse);
    } catch (err: unknown) {
      if (lastMessage) {
        this.updateLastMessage(lastMessage);
      }
      this.alertError(await this.getErrorMessage(err));
    }
  }

  async onMessageEntered(e: ChatTypes.MessageEnteredEvent, setDisabled: Function, attachedFiles?: File[]): Promise<void> {
    let { message, event } = e;
    (event?.target as HTMLElement).blur();
    this.setAlerts([]);
    message.id = Date.now().toString();
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    this.dataSource
      ?.store()
      .push([{ type: 'insert', data: message }]);
    this.typingUsersSubject.next([assistant]);

    try {
      const aiMessage = await this.getAIResponse(message, false, attachedFiles);
      setTimeout(() => {
        this.typingUsersSubject.next([]);
        this.dataSource?.store().push([{ type: 'insert', data: aiMessage }]);
      }, 500);
    } catch (err: unknown) {
      (event?.target as HTMLElement).focus();
      this.typingUsersSubject.next([]);
      this.alertError(await this.getErrorMessage(err));
    } finally {
      (event?.target as HTMLElement).focus();
      setDisabled(false);
    }
  }

  objectToFormData(obj: any, form?: FormData, namespace?: string) {
    const formData = form || new FormData();

    if (obj && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof File)) {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const formKey = namespace ? `${namespace}[${key}]` : key;

        if (key === 'attachedFiles') {
          value.forEach((_: any, index: any) => {
            formData.append('files', value[index]);
          });
        } else if (value instanceof Date) {
          formData.append(formKey, value.toISOString());
        } else if (value instanceof File || value instanceof Blob) {
          formData.append(formKey, value);
        } else if (Array.isArray(value)) {
          value.forEach((element, index) => {
            const tempKey = `${formKey}[${index}]`;
            if (typeof element === 'object') {
              this.objectToFormData(element, formData, tempKey);
            } else {
              formData.append(tempKey, element);
            }
          });
        } else if (typeof value === 'object' && value !== null) {
          this.objectToFormData(value, formData, formKey);
        } else if (value !== undefined && value !== null) {
          formData.append(formKey, value);
        }
      });
    }
    return formData;
  }
}

const appService = new AppService();
export default appService;
