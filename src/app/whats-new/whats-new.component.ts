import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-whats-new',
  templateUrl: './whats-new.component.html',
  styleUrls: ['./whats-new.component.scss']
})
export class WhatsNewComponent {
  @Output() closeEvent = new EventEmitter<boolean>();

  closeMe() {
    this.closeEvent.emit(false);
  }
}
