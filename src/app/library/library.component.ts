import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { Track } from '../track/track.component';
import { LibraryDataService } from '../service/data/library-data.service';
import { UI_SEARCH_TEXT, UI_CATS_TEXT, CrateMeta, CRATES_SELECTABLE, CRATES_SIMPLEVIEW, CRATE_ALL, CRATES_ALBUMVIEW, UI_REQUEST_TEXT, UI_BTN_TOOLTIP_DISABLED, UI_REQUEST_PENDING_TEXT } from '../app.constants';
import { FormControl } from '@angular/forms';
import { Observable, Subscription, debounceTime, filter, map, startWith } from 'rxjs';
import { PlaylistDataService } from '../service/data/playlist-data.service';
import { PlaylistTrack } from '../playlist-track/playlist-track.component';

export class OnlineResult {
  id!: number;
  artist: string = "";
  title: string = "";
  album: string = "";
  duration!: number;
  explicit: boolean = false;
}

export class SongRequest {
  constructor(
    public filePath: string,
    public title: string,
    public artist: string,
    public duration: number,
    public rated: boolean = false
  ){}
}

/** Main component code */

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {
  @Input() tracks!: Track[];
  @Input() justRequested: string = "";
  @Output() requestEvent = new EventEmitter<Track>();
  @Output() askTheDJEvent = new EventEmitter<string>();

  onlineResults!: OnlineResult[];
  //tracks!: Track[];
  filteredTracks!: Observable<Track[]>;
  headingList: String[] = [];
  headingListChanged: boolean = true;
  //@Input() filterCrate: number = 0;
  selectedCrateIds: string[] = [];
  filterCrates: CrateMeta[] = [];
  unFilterCrates: CrateMeta[] = CRATES_SELECTABLE; //AMS 9/22/2025 - Trying to track non-active crates separately
  startsWith: string = "";
  //searchTerm: string = "";
  searchControl: FormControl = new FormControl();
  //justRequested: string = "";
  showReqToast: boolean = false;
  reqToastText: string = "";
  requestInterval: any;
  toastInterval: any;
  alphabet: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  showCrateDropDown: boolean = false;
  scrolledDown: boolean = false;
  //requestSubscription: Subscription;
  buttonTooltip: string = "";
  mostRecentSearch: string = "";
  /* imported constants */
  UI_SEARCH_TEXT: string = UI_SEARCH_TEXT;
  UI_CATS_TEXT: string = UI_CATS_TEXT;
  UI_REQUEST_TEXT: string = UI_REQUEST_TEXT;
  UI_REQUEST_PENDING_TEXT: string = UI_REQUEST_PENDING_TEXT;
  CRATES_SELECTABLE: CrateMeta[] = CRATES_SELECTABLE;
  CRATES_SIMPLEVIEW: string[] = CRATES_SIMPLEVIEW;
  CRATES_ALBUMVIEW: string[] = CRATES_ALBUMVIEW;

  constructor(
    private libraryDataService: LibraryDataService,
    private playlistDataService: PlaylistDataService
  ){ }

  ngOnChanges(changes: { tracks: any; justRequested: string }) {
    if (changes.tracks) {
      this.filteredTracks = this.searchControl.valueChanges.pipe(debounceTime(500), startWith(''), map(value => this._filter(value)));
    }
    if (changes.justRequested) {
      //console.log("Library - justRequested: " + this.justRequested);
    }
  }

  ngOnInit(): void {
  }

  /**
   * Track & manage window scrolling behavior
   * (allows for automatic scrolling to links)
   */
  @HostListener("window:scroll", [])
  onWindowScroll() {
    const number = document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (number > 0) {
      this.scrolledDown = true;
    } else {
      this.scrolledDown = false;
    }
  }

  /**
   * Filter library view by term entered in search box.
   * This and calling code are borrowed from
   * https://stackblitz.com/angular/lndebkoyare?file=app%2Fautocomplete-filter-example.ts
   * @param value string - input search term
   * @returns Track[] - filtered array of Track objects
   */
  private _filter(value: string): Track[] {
    //console.log("_filter: ENTER");
    const filterValue = value ? value.trim().toLowerCase() : "";
    let s = "";
    // AMS 9/30/2024 - ALso trigger online search
    if (filterValue!=this.mostRecentSearch) {
      if (filterValue=="") {
        this.onlineResults = [];
      } else {
        this.libraryDataService.deezerSearch(this.searchControl.value).subscribe(data2 => {
          this.onlineResults = data2;
        });
      }      
      this.mostRecentSearch = filterValue;  // This should prevent duplicate searches
    }
    this.filterCrates.forEach(c=>s+=c.id);
    this.filterCrates = [];
    if (this.selectedCrateIds.length > 0) { // some track category selected
      // In order to avoid changing category view TOO fast, defer directive-modifying variable change to here
      CRATES_SELECTABLE.forEach(c => {
        if (this.selectedCrateIds.includes(c.id) && !this.filterCrates.includes(c)) { this.filterCrates.push(c); }
      });
      this.headingListChanged = true;
      this.unFilterCrates = CRATES_SELECTABLE.filter(c => !this.selectedCrateIds.includes(c.id));
      // "some" function checks if one array contains any element of another; "every" checks if it has ALL
      return this.tracks.filter(track => this.hasAllSearchTerms(this.friendlyTrackString(track), filterValue) && this.selectedCrateIds.every(e=>track.crates.includes(e)));
    } else {                      // "All tracks"
      // In order to avoid changing category view TOO fast, defer directive-modifying variable change to here
      CRATES_SELECTABLE.forEach(c => {        
        if (this.selectedCrateIds.includes(c.id) && !this.filterCrates.includes(c)) { this.filterCrates.push(c); }     
      });
      this.headingListChanged = true;
      this.unFilterCrates = CRATES_SELECTABLE.filter(c => !this.selectedCrateIds.includes(c.id));
      return this.tracks.filter(track => this.hasAllSearchTerms(this.friendlyTrackString(track), filterValue));
    }
  }

  /**
   * Build an easily-searchable string of all the most pertinent metadata
   * about a track.
   * @param t Track metadata
   * @returns 
   */
  private friendlyTrackString(t: Track): string {
    var friendlyText: string = "";

    if (t.title) friendlyText += t.title;

    if (t.artist) { 
      friendlyText += " - " + t.artist;
    } else if (t.albumArtist) { 
      friendlyText += " - " + t.albumArtist;
    }

    if (t.composer) {
      friendlyText += " - " + t.composer
    }

    if (t.grouping) {
      friendlyText += " [ " + t.grouping + "]";
    }

    if (t.album) {
      friendlyText += " - " + t.album
    }

    if (t.year) {
      friendlyText += " (" + t.year + ")"
    }    

    if (t.searchTerms) {
      friendlyText += " - " + t.searchTerms
    }

    if (t.genre) {
      friendlyText += "(" + t.genre + ")"
    }

    

    return friendlyText;
  }

  /**
   * Split a search string into separate components by space.
   * Search another given string by each term individually.
   * If any term is NOT found, return false.
   * Return true if it contains ALL of the terms.
   * (Use this to make searches smarter and return matches for both "Radiohead" and "Kid A" for example,
   * instead of "Radiohead Kid A" turning up nothing.)
   * @param searchString 
   * @param searchable 
   * @returns 
   */
  private hasAllSearchTerms(searchable: string, searchString: string): boolean {
    //if (searchString=="") return true;
    let searchTerms = searchString.toLowerCase().split(" ");
    let searchableTemp = searchable.toLowerCase();
    for (let term of searchTerms) {
      if (!searchableTemp.includes(term)) return false;
    }
    return true;
  }

  /**
   * Set the active crate.
   * @param id 
   */
  selectCrate(id: string) {
    // If blank selection, clear all crates
    if (id.trim()=="") {
      this.selectedCrateIds = [];
    } else {
      // Check if crate already selected; if so, deselect it
      if (this.selectedCrateIds.includes(id)) {
        let i = this.selectedCrateIds.indexOf(id);
        this.selectedCrateIds.splice(i,1);
      } else {
        this.selectedCrateIds.push(id);
      }
    }    
    this.searchControl.updateValueAndValidity({onlySelf: false, emitEvent: true});
    //this.toggleCrateDropDown();
  }

  /**
   * Toggle the flag that determines if the
   * crate selector drop-down is showing.
   */
  toggleCrateDropDown() {
    this.showCrateDropDown = !this.showCrateDropDown;
  }

  requestSong(song: Track) {
    this.requestEvent.emit(song);
  }

  requestSongDeezer(song: OnlineResult) {
    let deezerTrack = new Track();
    deezerTrack.filePath = "netsearch%3A%2F%2Fdz" + song.id;
    deezerTrack.id = song.id;
    deezerTrack.artist = song.artist;
    deezerTrack.title = song.title;
    deezerTrack.duration = song.duration;
    deezerTrack.rating = 0;
    console.log(song.artist + song.title);
    console.log(deezerTrack.artist + deezerTrack.title);
    this.requestSong(deezerTrack);
  }

  askTheDJ(message: string) {
    this.askTheDJEvent.emit(message);
  }

  askTheDJSong(artist: string, title: string) {
    this.askTheDJ(artist + " - " + title);
  }

  /**
   * Triggers the page to scroll to the first table heading
   * that matches the chosen letter of the alphabet (or number).
   * @param index The index of the selected character in the "alphabet" array.
   * @returns 
   */
  alphaJump(index: number): void {
    if (this.headingListChanged) {
      this.headingList = this.getTableHeadings();
      this.headingListChanged = false;
    }
    //Iterate through alphabet array backwards starting at selected character
    for (let i=index; i>=0; i--) {
      let x=this.alphabet[i].toLowerCase();
      //Iterate through headings array until finding one that starts with current character
      for (let j=0; j<this.headingList.length; j++) {
        let a = this.headingList[j].toLowerCase();
        if (a.startsWith(x) && !a.startsWith("the ")) {
          window.location.hash = "#" + this.headingList[j];
          return
        }
      }
    }
    //If none found above...
    //Iterate through alphabet array forwards starting at selected character
    for (let i=index; i<=this.alphabet.length; i++) {
      let x=this.alphabet[i].toLowerCase();
      //Iterate through headings array until finding one that starts with current character
      for (let j=0; j<this.headingList.length; j++) {
        let a = this.headingList[j].toLowerCase();
        if (a.startsWith(x) && !a.startsWith("the ")) {
          window.location.hash = "#" + this.headingList[j];
          return
        }
      }
    }
    return;
  }

  /**
   * Returns the text of all table headings as a String array.
   * Used to get an up-to-date list of all artist groupings.
   * @returns String[] Inner text of all <TH> elements
   */
  getTableHeadings(): String[] {
    //let heads = document.getElementsByTagName('th');
    let heads = document.getElementsByClassName('indexedHeader');
    let headingTexts: String[] = [];
    for (let i=0; i < heads.length; i++) {
      let temp;
      if (heads.item(i))  temp = heads.item(i)?.firstChild?.textContent;
      if (temp)           headingTexts.push(temp);
    }
    return headingTexts;
  }
}
