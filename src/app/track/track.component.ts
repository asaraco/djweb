import { Component, OnInit } from '@angular/core';

export class Track {
  id!: number;
  filePath: string = "";
  artist: string = "";
  title: string = "";
  album: string = "";
  albumArtist: string = "";
  sortArtist: string = "";
  grouping: string = "";
  duration: number = 0;
  year: number = 0;
  genre: string = "";
  crates!: string[];
  constructor() {
  }
}

@Component({
  selector: 'app-track',
  templateUrl: './track.component.html',
  styleUrls: ['./track.component.scss']
})
export class TrackComponent implements OnInit {
  id: number = 0;
  track!: Track;
  constructor(){}
  ngOnInit(): void {
  }
}
