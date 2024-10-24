import { Component, HostListener, OnInit } from '@angular/core';
import { Track } from '../track/track.component';
import { LibraryDataService } from '../service/data/library-data.service';
import { UI_SEARCH_TEXT, UI_CATS_TEXT, CrateMeta, CRATES_SELECTABLE, CRATES_SIMPLEVIEW, CRATE_ALL, CRATES_ALBUMVIEW, UI_REQUEST_TEXT, UI_BTN_TOOLTIP_DISABLED, UI_REQUEST_PENDING_TEXT } from '../app.constants';
import { FormControl } from '@angular/forms';
import { Observable, Subscription, debounceTime, map, startWith } from 'rxjs';
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
    private filePath: string = "",
    private title: string = "",
    private artist: string = "",
    private rated: boolean = false
  ){}
}

/** Main component code */

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {
  onlineResults!: OnlineResult[];
  tracks!: Track[];
  filteredTracks!: Observable<Track[]>;
  headingList: String[] = [];
  headingListChanged: boolean = true;
  //@Input() filterCrate: number = 0;
  selectedCrateIds: string[] = [];
  filterCrates: CrateMeta[] = [];
  startsWith: string = "";
  searchTerm: string = "";
  searchControl: FormControl = new FormControl();
  justRequested: number = -1;
  showReqToast: boolean = false;
  reqToastText: string = "";
  requestInterval: any;
  toastInterval: any;
  alphabet: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  showCrateDropDown: boolean = false;
  scrolledDown: boolean = false;
  requestSubscription: Subscription;
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
  ){
    this.requestSubscription = this.playlistDataService.watchForNotification().subscribe((data)=>{
      this.justRequested = 999999999999999;
      this.setReqDelay(data.duration, data.reqTotal, new Date());
      if (data.triggerRefresh) {
        this.libraryDataService.retrieveAllTracks().subscribe(
          data => { 
                    this.tracks = data;
                    this.filteredTracks = this.searchControl.valueChanges.pipe(debounceTime(500), startWith(''), map(value => this._filter(value)));
                    //this.alphaJump(0);
                  }
        );
      }      
    })
  }

  ngOnInit(): void {
    console.log("LIBRARY ON INIT");
    // Get main list of tracks
    this.libraryDataService.retrieveAllTracks().subscribe(
      data => { 
                this.tracks = data;
                this.filteredTracks = this.searchControl.valueChanges.pipe(debounceTime(500), startWith(''), map(value => this._filter(value)));
                //this.alphaJump(0);
              }
    );
    // Handle request blocking
    const now = new Date();
    const ls_noRequestsUntil = localStorage.getItem('noRequestsUntil');
    const ls_lastRequest = localStorage.getItem('lastRequest');
    if (ls_noRequestsUntil) {
      let remainingTimeout = JSON.parse(ls_noRequestsUntil) - now.getTime();
      if (remainingTimeout > 0) { 
        if (ls_lastRequest) this.justRequested = JSON.parse(ls_lastRequest);
        this.requestInterval = setInterval(() => this.reqTimeoutOver(), remainingTimeout);
      }
    }
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
    console.log("_filter: ENTER");
    const filterValue = value ? value.toLowerCase(): "";
    let s = "";
    // AMS 9/30/2024 - ALso trigger online search
    if (!(value==null || value=="") && value!=this.mostRecentSearch) {
      this.libraryDataService.deezerSearch(this.searchControl.value).subscribe(data2 => {
        this.onlineResults = data2;
      });
      this.mostRecentSearch = value;  // This should prevent duplicate searches
    }
    this.filterCrates.forEach(c=>s+=c.id);
    //return this.tracks.filter(track => this.friendlyTrackString(track).toLowerCase().includes(filterValue));
    this.filterCrates = [];
    if (this.selectedCrateIds.length > 0) { // some track category selected
      // In order to avoid changing category view TOO fast, defer directive-modifying variable change to here
      //this.filterCrate = this.selectedCrateId;
      CRATES_SELECTABLE.forEach(c => {        
        if (this.selectedCrateIds.includes(c.id) && !this.filterCrates.includes(c)) { this.filterCrates.push(c); }
      });
      this.headingListChanged = true;
      // "some" function checks if one array contains any element of another; "every" checks if it has ALL
      //return this.tracks.filter(track => this.friendlyTrackString(track).toLowerCase().includes(filterValue) && this.selectedCrateIds.every(e=>track.crates.includes(e)));
      return this.tracks.filter(track => this.hasAllSearchTerms(this.friendlyTrackString(track), filterValue) && this.selectedCrateIds.every(e=>track.crates.includes(e)));
    } else {                      // "All tracks"
      // In order to avoid changing category view TOO fast, defer directive-modifying variable change to here
      //this.filterCrate = this.selectedCrateId;
      CRATES_SELECTABLE.forEach(c => {        
        if (this.selectedCrateIds.includes(c.id) && !this.filterCrates.includes(c)) { this.filterCrates.push(c); }     
      });
      this.headingListChanged = true;
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

    if (t.album) {
      friendlyText += "[" + t.album + "]"
    }

    if (t.year) {
      friendlyText += " (" + t.year + ")"
    }

    if (t.genre) {
      friendlyText += " - " + t.genre
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
    // Check if crate already selected; if so, deselect it
    if (this.selectedCrateIds.includes(id)) {
      // "Deep copy" the array to force DOM to update
      /*
      let tempArray: string[] = [];
      this.selectedCrateIds.forEach(c=>tempArray.push(c));
      this.selectedCrateIds = [];
      let i = tempArray.indexOf(id);
      tempArray.splice(i,1);
      tempArray.forEach(t=>this.selectedCrateIds.push(t));
      */
      let i = this.selectedCrateIds.indexOf(id);
      this.selectedCrateIds.splice(i,1);
    } else {
      this.selectedCrateIds.push(id);
    }
    this.searchControl.updateValueAndValidity({onlySelf: false, emitEvent: true});
    this.toggleCrateDropDown();
  }

  /**
   * Toggle the flag that determines if the
   * crate selector drop-down is showing.
   */
  toggleCrateDropDown() {
    this.showCrateDropDown = !this.showCrateDropDown;
  }

  /**
   * Add a song to the Auto DJ queue.
   * Set a delay on future requests 
   * using a calculation based on the song's duration.
   * @param id Track id
   * @param duration Track duration
   */
  requestSongById(id: number, duration: number) {
    //Verify that requests aren't currently delayed
    const now = new Date();
    const nru = localStorage.getItem('noRequestsUntil');
    if ((nru) && (now.getTime() < JSON.parse(nru))) { 
      //console.log("Sorry, no requests until " + nru);
    } else {
      //Get total # of requests by this user from local storage
      //let userId = localStorage.getItem('userId');
      let ls_requestTotal = localStorage.getItem('requestTotal');
      let requestTotal: number = 0;
      if (ls_requestTotal) {
        requestTotal = JSON.parse(ls_requestTotal);
      }
      //console.log("requestTotal = " + requestTotal);
      // Set username
      var username: string;
      let ls_userId = localStorage.getItem('userId');
      if (ls_userId) {
        username = ls_userId;
      } else {
        username = "";
      }
      //Make the request
      //console.log("Request song #" + id);
      var resultMsg: string;
      //this.playlistDataService.requestTrack(id).subscribe(data => {
      this.playlistDataService.requestTrackAndAskTheDJ(id,username).subscribe(data => {
        //console.log("Got a result");
        resultMsg = data;
        console.log(resultMsg);
        if (resultMsg=="OK") {
          this.reqToastText = UI_REQUEST_TEXT;
          this.showReqToast = true;
          localStorage.setItem('lastRequest', id.toString());
          //this.setReqDelay(duration, now);
          this.playlistDataService.notifyOfRequest(duration, requestTotal, false);
          this.justRequested = id;
        } else {
          this.reqToastText = "Something went wrong. Please try again or notify the DJ.";
          this.showReqToast = true;
        }        
      });    
    }
  }

  requestSong(song: Track) {
    //Verify that requests aren't currently delayed
    const now = new Date();
    const nru = localStorage.getItem('noRequestsUntil');
    if ((nru) && (now.getTime() < JSON.parse(nru))) { 
      //console.log("Sorry, no requests until " + nru);
    } else {
      //Get total # of requests by this user from local storage
      //let userId = localStorage.getItem('userId');
      let ls_requestTotal = localStorage.getItem('requestTotal');
      let requestTotal: number = 0;
      if (ls_requestTotal) {
        requestTotal = JSON.parse(ls_requestTotal);
      }
      //console.log("requestTotal = " + requestTotal);
      //Make the request
      //console.log("Request song #" + id);
      var resultMsg: string = "false";
      //this.playlistDataService.requestTrack(id).subscribe(data => {
      this.playlistDataService.requestFile(song, true).subscribe(data => {
        //console.log("Got a result");
        resultMsg = data.toString();
        console.log(resultMsg);
        if (resultMsg==="true") {
          this.reqToastText = UI_REQUEST_TEXT;
          this.showReqToast = true;
          localStorage.setItem('lastRequest', song.id.toString());
          //this.setReqDelay(duration, now);
          this.playlistDataService.notifyOfRequest(song.duration, requestTotal, false);
          this.justRequested = song.id;
        } else {
          this.reqToastText = "Something went wrong. Please try again or notify the DJ.";
          this.showReqToast = true;
        }        
      });    
    }
  }

  requestSongDeezer(song: OnlineResult) {
    let deezerTrack = new Track();
    deezerTrack.filePath = "netsearch%3A%2F%2Fdz" + song.id;
    deezerTrack.id = song.id;
    deezerTrack.artist = song.artist;
    deezerTrack.title = song.title;
    deezerTrack.duration = song.duration;
    console.log(song.artist + song.title);
    console.log(deezerTrack.artist + deezerTrack.title);
    this.requestSong(deezerTrack);
  }

  askTheDJ(message: string) {
    var resultMsg: string;
    // Set username
    var username: string;
    let ls_userId = localStorage.getItem('userId');
    if (ls_userId) {
      username = ls_userId;
    } else {
      username = "";
    }
    // Send request
    console.log(message);
    this.playlistDataService.requestAskTheDJ(encodeURIComponent(message), encodeURIComponent(username)).subscribe(data => {
      //console.log("Got a result");
      resultMsg = data;
      //console.log(resultMsg);
      this.reqToastText = UI_REQUEST_PENDING_TEXT;
      this.showReqToast = true;
    })
  }

  askTheDJSong(artist: string, title: string) {
    this.askTheDJ(artist + " - " + title);
  }

  /**
   * Calculate and set a delay 
   * @param duration 
   * @param now 
   */
  setReqDelay(duration: number, reqTotal: number, now: Date) {
    //Determine time since last request; if it's been a while, cut the "request total" down
    const ls_noRequestsUntil = localStorage.getItem('noRequestsUntil');
    if (ls_noRequestsUntil) {
      let nru: number = JSON.parse(ls_noRequestsUntil);
      let timeSince: number = now.getTime() - nru;
      //console.log("LIBRARY: It's been " + timeSince + " since a request was made and delayed");
      if (timeSince > 1800000) {  // 1,800,000 milliseconds = 30 minutes
        let discountFactor = 1 + (timeSince / 1800000); // At least 1; for every half hour, add another
        reqTotal = Math.round(reqTotal/discountFactor);
      }
    }
    //Calculate delay
    let newDelay = Math.round(duration) * ((1 + Math.round(reqTotal/3))*100);
    this.requestInterval = setInterval(() => this.reqTimeoutOver(), newDelay);
    let delayTime = now.getTime() + newDelay;
    //console.log("Setting noRequestsUntil to " + delayTime);
    localStorage.setItem('noRequestsUntil', JSON.stringify(delayTime));
    reqTotal++;
    localStorage.setItem('requestTotal',JSON.stringify(reqTotal));
    //Set button tooltips
    this.buttonTooltip = UI_BTN_TOOLTIP_DISABLED;
    }

  /**
   * Reset request timeout variables when time's up
   */
  reqTimeoutOver() {
    this.justRequested = -1;
    //this.showReqToast = false
    clearInterval(this.requestInterval);
    this.buttonTooltip = "";
  }

  reqToast() {
    this.showReqToast = true;
    this.toastInterval = setInterval(() => {this.showReqToast = false; clearInterval(this.toastInterval)}, 2000);
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

  deezerSearch(query: string) {
    this.libraryDataService.deezerSearch(this.searchControl.value).subscribe(data => {
      this.onlineResults = data;
    });
  }
}
