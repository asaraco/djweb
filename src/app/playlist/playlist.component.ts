import { Component, Input, OnInit } from '@angular/core';
import { PlaylistDataService } from '../service/data/playlist-data.service';
import { PlaylistTrack } from '../playlist-track/playlist-track.component';


export class Playlist {
  name!: string;
  //dateModified!: Date;
  playlistTracks!: PlaylistTrack[];
  constructor(
    //public id: number
  ) {}
}

export class PlaylistQueue extends Playlist {
  dbOutdated: boolean = false;
  currentTrackDurationSec: number = 0;
  currentTrackProgress: number = 0.0;
  currentTrackRemainingMs: number = 0;
}

@Component({
  selector: 'app-playlist',
  templateUrl: './playlist.component.html',
  styleUrls: ['./playlist.component.scss']
})
export class PlaylistComponent implements OnInit {
  @Input() playlist!: Playlist;

  constructor() {}

  ngOnInit(): void {
  }
}
