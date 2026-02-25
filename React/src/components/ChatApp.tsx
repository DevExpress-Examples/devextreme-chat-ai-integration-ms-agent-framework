import {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { loadMessages } from 'devextreme/localization';
import Chat, { FileUploaderOptions } from 'devextreme-react/chat';
import type { ChatTypes } from 'devextreme-react/chat';
import type { FileUploaderTypes } from 'devextreme-react/file-uploader';
import appService from '../ChatService';
import MessageTemplate from './MessageTemplate.tsx';
import {
  CHAT_DISABLED_CLASS,
  CHAT_DROP_ZONE_ACTIVE_CLASS,
  user as chatUser, allowedFileExtensions,
} from '../data';

export default function ChatApp(): JSX.Element {
  const user = chatUser;
  const [isDisabled, setDisabled] = useState(false);
  const [isDropZoneActive, toggleDropZoneActive] = useState(false);
  const [typingUsers, setTypingUsers] = useState<ChatTypes.User[]>([]);
  const [alerts, setAlerts] = useState<ChatTypes.Alert[]>([]);
  const [chatDS, setChatDS] = useState<any>(appService.dataSource);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const chatClassName = useMemo(() => `${isDisabled ? CHAT_DISABLED_CLASS : ''} ${isDropZoneActive ? CHAT_DROP_ZONE_ACTIVE_CLASS : ''}`, [isDisabled, isDropZoneActive]);

  useEffect(() => {
    const typingSubscription = appService.typingUsers$.subscribe(setTypingUsers);
    const alertsSubscription = appService.alerts$.subscribe(setAlerts);
    appService.initDataSource().then((r) => setChatDS(r));
    return (): void => {
      typingSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
    };
  }, []);

  const onMessageEntered = useCallback((e: ChatTypes.MessageEnteredEvent) => {
    setDisabled(true);
    appService.onMessageEntered(e, setDisabled, attachedFiles);
  }, [attachedFiles]);

  const onRegenerateButtonClick = useCallback(async (): Promise<void> => {
    setDisabled(true);
    appService.updateLastMessage();

    try {
      await appService.regenerate();
    } finally {
      setDisabled(false);
    }
  }, []);

  const messageRender = useCallback(
    ({ message }: { message: ChatTypes.Message }) => <MessageTemplate text={message.text ?? ''} onRegenerateButtonClick={onRegenerateButtonClick} />,
    [onRegenerateButtonClick],
  );

  const uploadFile = useCallback(() => {
    toggleDropZoneActive(false);
  }, []);

  const onDropZoneEnter = useCallback(({ dropZoneElement, event }: FileUploaderTypes.DropZoneEnterEvent) => {
    if (dropZoneElement.id === 'chat') {
      const items = (event!.originalEvent as DragEvent).dataTransfer?.items ?? [];
      const isValidFileExtension = Array.from(items).every((i) => allowedFileExtensions.includes(`.${i.type.replace(/^image\//, '')}`));

      if (isValidFileExtension) {
        toggleDropZoneActive(true);
      }
    }
  }, []);

  const onDropZoneLeave = useCallback(({ dropZoneElement }: FileUploaderTypes.DropZoneLeaveEvent) => {
    if (dropZoneElement.id === 'chat') {
      toggleDropZoneActive(false);
    }
  }, []);

  const onFileUploaderValueChanged = useCallback(({ value }: FileUploaderTypes.ValueChangedEvent) => {
    setAttachedFiles(value ?? []);
  }, []);

  return (
    <div className="demo-container">
      <Chat
        id='chat'
        className={chatClassName}
        dataSource={chatDS}
        reloadOnChange={false}
        showAvatar={false}
        height={600}
        showDayHeaders={false}
        user={user}
        typingUsers={typingUsers}
        alerts={alerts}
        onMessageEntered={onMessageEntered}
        messageRender={messageRender}
      >
        <FileUploaderOptions
          uploadFile={uploadFile}
          onValueChanged={onFileUploaderValueChanged}
          uploadedMessage='File attached'
          allowedFileExtensions={allowedFileExtensions}
          dropZone='#chat'
          onDropZoneEnter={onDropZoneEnter}
          onDropZoneLeave={onDropZoneLeave}
        />
      </Chat>
    </div>
  );
}

loadMessages(appService.getDictionary());
