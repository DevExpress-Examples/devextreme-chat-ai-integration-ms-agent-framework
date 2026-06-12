import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { Observable } from 'rxjs';
import {type DxChatTypes, DxChatModule} from 'devextreme-angular/ui/chat';
import { DataSource } from 'devextreme-angular/common/data';
import { loadMessages } from 'devextreme/localization';
import { AppService } from './app.service';
import { REGENERATION_TEXT } from './data';
import { DxFileUploaderTypes } from 'devextreme-angular/ui/file-uploader';
import { DxButtonModule } from 'devextreme-angular/ui/button';

@Component({
    selector: 'app-root',
    imports: [DxButtonModule, DxChatModule, AsyncPipe, NgIf],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  dataSource: DataSource | [];

  regenerationText: string = REGENERATION_TEXT;

  user: DxChatTypes.User;

  typingUsers$: Observable<DxChatTypes.User[]>;

  alerts$: Observable<DxChatTypes.Alert[]>;

  copyButtonIcon: string;

  isDisabled = false;

  isDropZoneActive = false;

  attachedFiles: File[] = [];

  allowedFileExtensions: string[] = ['.jpg', '.jpeg', '.png'];

  constructor(private readonly appService: AppService) {
    loadMessages(this.appService.getDictionary());
    this.user = this.appService.user;
    this.alerts$ = this.appService.alerts$;
    this.typingUsers$ = this.appService.typingUsers$;
    this.copyButtonIcon = 'copy';
    this.dataSource = [];

    this.uploadFile = this.uploadFile.bind(this);
    this.onDropZoneEnter = this.onDropZoneEnter.bind(this);
    this.onDropZoneLeave = this.onDropZoneLeave.bind(this);
    this.onFileUploaderValueChanged = this.onFileUploaderValueChanged.bind(this);
  }

  async ngOnInit(): Promise<void> {
    this.dataSource = await this.appService.initDataSource() ?? [];
  }

  onFileUploaderValueChanged(e: DxFileUploaderTypes.ValueChangedEvent): void {
    this.attachedFiles = e.value ?? [];
  }

  uploadFile() {
    this.isDropZoneActive = false;
  };

  onDropZoneEnter({ component, dropZoneElement, event }: DxFileUploaderTypes.DropZoneEnterEvent) {
    if (dropZoneElement.id === 'chat') {
      const items = (event!.originalEvent as DragEvent).dataTransfer?.items ?? [];
      const allowedFileExtensions = component.option('allowedFileExtensions') ?? [];
      const isValidFileExtension = Array.from(items).every(i => allowedFileExtensions.includes(`.${i.type.replace(/^image\//, '')}`));

      if (isValidFileExtension) {
        this.isDropZoneActive = true;
      }
    }
  }

  onDropZoneLeave({ dropZoneElement }: DxFileUploaderTypes.DropZoneLeaveEvent) {
    if (dropZoneElement.id === 'chat') {
      this.isDropZoneActive = false;
    }
  }

  convertToHtml(message: DxChatTypes.Message): string {
    return this.appService.convertToHtml(message.text || '');
  }

  async onMessageEntered(e: DxChatTypes.MessageEnteredEvent): Promise<void> {
    this.isDisabled = true;
    try {
      await this.appService.onMessageEntered(e, this.attachedFiles);
    } finally {
      this.isDisabled = false;
    }
  }

  onCopyButtonClick(message: DxChatTypes.Message): void {
    navigator.clipboard?.writeText(message.text ?? '').catch(() => {});

    this.copyButtonIcon = 'check';

    setTimeout(() => {
      this.copyButtonIcon = 'copy';
    }, 2500);
  }

  async onRegenerateButtonClick(): Promise<void> {
    this.appService.updateLastMessage();
    this.isDisabled = true;

    try {
      await this.appService.regenerate();
    } finally {
      this.isDisabled = false;
    }
  }
}
