import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Track } from '../track/track.component';
import { LibraryDataService } from '../service/data/library-data.service';
import { PlaylistDataService } from '../service/data/playlist-data.service';
import { Subscription } from 'rxjs';
import { CRATE_LAN_LIBRARY, CrateMeta, UI_BTN_TOOLTIP_DISABLED, UI_REQUEST_TEXT } from '../app.constants';
import { SongRequest } from '../library/library.component';

@Component({
  selector: 'app-new-arrivals',
  templateUrl: './new-arrivals.component.html',
  styleUrls: ['./new-arrivals.component.scss']
})
export class NewArrivalsComponent implements OnInit {
  @Input() uploadedTracks!: Track[];
  @Input() recentTracks!: Track[];
  @Input() justRequested: string = "";
  @Output() requestAddEvent = new EventEmitter<Track>();
  @Output() requestEvent = new EventEmitter<Track>();

  buttonTooltip: string = "";
  CRATE_LL: CrateMeta = CRATE_LAN_LIBRARY;
  UI_REQUEST_TEXT: string = UI_REQUEST_TEXT;
  
  constructor(
    private libraryDataService: LibraryDataService,
    private playlistDataService: PlaylistDataService
  ){
  }

  ngOnChanges(changes: { newTracks: any; justRequested: string; }) {
    if (changes.newTracks) {
      //console.log("newTracks changed");
    }
    if (changes.justRequested) {
      //console.log("NewArrivals - justRequested: " + this.justRequested);
    }
  }

  ngOnInit(): void {
  }

  requestAndAddSong(song: Track) {
    this.requestAddEvent.emit(song);
  }

  requestSong(song: Track) {
    this.requestEvent.emit(song);
  }

  toggleSection(sectionName: string) {
    let section = document.getElementById("section_" + sectionName);
    if (section!=null) {
      if (section.style.display!='none') {
        section.style.display='none';
      } else {
        section.style.display='block';
      }
    }    
  }

  refreshNew() {
    this.libraryDataService.forceReloadAll().subscribe(
      response => {
        console.log("New arrivals refreshed.");
      }
    );
  }
}