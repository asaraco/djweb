import { Component, HostListener, OnInit } from '@angular/core';
import { PlaylistDataService } from './service/data/playlist-data.service';
import { UserDataService } from './service/data/user-data.service';
import { Playlist } from './playlist/playlist.component';
import { repeat, Subscription } from 'rxjs';
import { UI_BTN_TOOLTIP_DISABLED, UI_HELPTEXT_REQUEST, UI_HELPTEXT_UPLOAD, UI_REQUEST_ERROR_TEXT, UI_REQUEST_TEXT, UI_WELCOME_TEXT } from './app.constants';
import { Track } from './track/track.component';
import { LibraryDataService } from './service/data/library-data.service';
import { SongRequest } from './library/library.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title: string = "Legendary Radio";
  lightTheme: boolean = false;
  themeButton: string = "Switch Theme";
  mostRecentPlaylist: Playlist = new Playlist();
  autoDjPlaylist: Playlist = new Playlist();
  libraryTracks: Track[] = [];
  uploadedTracks: Track[] = [];
  recentTracks: Track[] = [];
  showMenu: boolean = false;
  showQueue: boolean = false;  
  showNew: boolean = false;
  firstTime: boolean = false;
  showHelp: boolean = false;
  scrolledDown: boolean = false;
  //requestSubscription: Subscription;
  currentTrackDuration: number = 100;
  currentTrackProgress!: number;
  progressBarInterval!: any;
  uploadCheckInterval!: any;
  refreshLibrary: boolean = true;
  refreshNewUploads: boolean = true;
  refreshCounter: number = 0;
  requestInterval: any;
  toastInterval: any;
  justRequested: string = "";
  buttonTooltip: string = "";
  showReqToast: boolean = false;
  reqToastText: string = "";
  /* imported constants */
  UI_WELCOME_TEXT: string = UI_WELCOME_TEXT;
  UI_HELPTEXT_REQUEST: string = UI_HELPTEXT_REQUEST;
  UI_HELPTEXT_UPLOAD: string = UI_HELPTEXT_UPLOAD;
  UI_REQUEST_TEXT: string = UI_REQUEST_TEXT;
  UI_REQUEST_ERROR_TEXT: string = UI_REQUEST_ERROR_TEXT;
  UI_BTN_TOOLTIP_DISABLED: string = UI_BTN_TOOLTIP_DISABLED;

  constructor(
    private libraryDataService: LibraryDataService,
    private playlistDataService: PlaylistDataService,
    private userDataService: UserDataService
    ){
      /*
      this.requestSubscription = this.playlistDataService.watchForNotification().subscribe((data) => {
        this.ngOnInit();
      });
      */
      // Set how often to refresh queue
      // AMS 2024/10/16 - Now attempting to set this within ngOnInit() below, via "get_time"
      //setInterval(() => this.ngOnInit(), this.currentTrackDuration * 750);
      
    }

  ngOnInit(): void {
    console.log("APP COMPONENT INIT");
    this.detectColorScheme();
    this.checkReqDelay();
    // AMS 10/24/2024 - refactoring to retrieve Library tracks at app level
    // Get main list of tracks
    if (this.libraryDataService.isLibraryOutdated()) {
      this.getLibrary();
    }
    // Get New Arrivals    
    if (this.libraryDataService.isUploadsOutdated()) {
      this.getNewArrivals();
    }
    // Get Queue
    this.getQueue();
    /* AMS 2023/10/16 - Retrieve or randomly generate a user ID # for this session.
                        Also store in array to make sure there are no duplicates. */
    // AMS 2024/10/24 - If present, retrieve "username" from URL param
    let username = window.location.search.substring(8); //string begins with "?userId="
    console.log("window.location.search = " + username);
    // Check if localStorage already has userId set, otherwise initialize it
    if (!localStorage.getItem('userId')) {
      if (username!="") {
        localStorage.setItem('userId', username);
      } else {
        this.userDataService.generateID().subscribe(data => {
          localStorage.setItem('userId', JSON.stringify(data));
          this.showHelp = true;
          localStorage.setItem('requestTotal', '0');
        });
      }
      console.log("Assigned User ID: " + localStorage.getItem('userId'));
    }
  }

  getLibrary(): void {
    this.libraryDataService.retrieveAllTracks().subscribe( data => {
      this.libraryTracks = data;
      this.refreshLibrary = false;
      this.libraryDataService.setLibraryOutdated(false);
    });
    // Get Recent Releases
    this.libraryDataService.retrieveRecentTracks().subscribe(data => this.recentTracks = data );
  }

  getNewArrivals(): void {
    let currentSize: number = this.uploadedTracks.length;
    let newSize: number = 0;
    console.log("Get new arrivals: currentSize / newSize " + currentSize + newSize);
    this.libraryDataService.retrieveNewTracks().subscribe( data => {
      this.uploadedTracks = data;
      this.refreshNewUploads = false;
      newSize = this.uploadedTracks.length;
      if (currentSize!=newSize && this.refreshCounter<10) {
        console.log("Refreshed New Arrivals but didn't seem to change. Trying again (up to 10x).");
        clearInterval(this.uploadCheckInterval);
        this.refreshCounter++;
      } 
      this.libraryDataService.setUploadsOutdated(false);
    });
    if (this.libraryDataService.isLibraryOutdated()) this.getLibrary();
  }

  getNewArrivalsUntilChanged(): void {
    //this.libraryDataService.setUploadsOutdated(true);
    this.uploadCheckInterval = setInterval(() => this.getNewArrivals(), 1000);
    //if (this.libraryDataService.isLibraryOutdated()) this.getLibrary();
  }

  getQueue(): void {
    /*** VDJ - "Automix" and most recent "History" M3U file */
    // For VDJ, 1st track of Automix Queue is the most reliable way of getting "current track"
    // (though it is also the last track of the latest M3U, but they refresh at different times)
    this.playlistDataService.retrieveAutomixQueue().subscribe(data => {
      // After Queue is loaded, get History playlist since it seems to usually get it first but it looks weird if they aren't both there
      this.playlistDataService.retrieveLastPlayed().subscribe(data => {
        this.mostRecentPlaylist.name = data.name;
        this.mostRecentPlaylist.playlistTracks = data.playlistTracks.reverse().splice(1);
        
      })
      this.autoDjPlaylist.name = data.name;
      this.autoDjPlaylist.playlistTracks = data.playlistTracks.splice(0,5).reverse();
      /* --- PROGRESS BAR --- */
      this.currentTrackDuration = data.currentTrackDurationSec;
      this.currentTrackProgress = data.currentTrackProgress * 100;  // fraction of 1.0, convert to percentage
      let remainingTimeMs = data.currentTrackRemainingMs;
      // If duration is 0, default it to the time remaining instead -- better than nothing, literally
      if (this.currentTrackDuration==0) {
        this.currentTrackDuration = remainingTimeMs/1000;
        console.log("defaulting currentTrackDuration to " + this.currentTrackDuration);
      }
      // Set current track progress bar interval, as well as refresh interval
      clearInterval(this.progressBarInterval);
      this.progressBarInterval = setInterval(() => this.incrementProgressBar(), this.currentTrackDuration*10); // *10 achieves "*1000" to convert to ms, then /100
    });
  }

  handleReq(song: Track, rated: boolean) {
    //Verify that requests aren't currently delayed
    const now = new Date();
    const nru = localStorage.getItem('noRequestsUntil');
    console.log("nru & now " + nru + " " + now);
    if ((nru) && (now.getTime() < JSON.parse(nru))) { 
      console.log("Should show toast");
      this.reqToastText = UI_BTN_TOOLTIP_DISABLED;
      this.showReqToast = true;
    } else {
      //Get total # of requests by this user from local storage
      let ls_requestTotal = localStorage.getItem('requestTotal');
      console.log("ls_requestTotal = " + ls_requestTotal);
      let requestTotal: number = 0;
      if (ls_requestTotal) {
        requestTotal = JSON.parse(ls_requestTotal);
      }
      //Make the request
      var resultMsg: string = "false";
      this.playlistDataService.requestFile(song, rated).subscribe(data => {
        resultMsg = data.toString();
        console.log(resultMsg);
        if (resultMsg==="true") {
          localStorage.setItem('lastRequest', song.id.toString());
          this.justRequested = song.filePath;
          this.reqToastText = UI_REQUEST_TEXT;
          this.showReqToast = true;
          this.setReqDelay(song.duration, requestTotal, now);
        } else {
          this.reqToastText = UI_REQUEST_ERROR_TEXT;
          this.showReqToast = true;
        }        
      });    
    }
  }

  handleReqNew(song: Track) {
    this.handleReq(song, false);
    this.getNewArrivalsUntilChanged();
  }

  handleReqLib(song: Track) {
    this.handleReq(song, true);
  }

  /**
   * Calculate and set a delay for requests
   * @param duration 
   * @param now 
   */
  setReqDelay(duration: number, reqTotal: number, now: Date) {
    //Determine time since last request; if it's been a while, cut the "request total" down
    const ls_noRequestsUntil = localStorage.getItem('noRequestsUntil');
    if (ls_noRequestsUntil) {
      let nru: number = JSON.parse(ls_noRequestsUntil);
      let timeSince: number = now.getTime() - nru;
      console.log("LIBRARY: It's been " + timeSince + " since a request was made and delayed");
      if (timeSince > 1800000) {  // 1,800,000 milliseconds = 30 minutes
        let discountFactor = 1 + (timeSince / 1800000); // At least 1; for every half hour, add another
        reqTotal = Math.round(reqTotal/discountFactor);
      }
    }
    //Calculate delay
    let newDelay = Math.round(duration) * ((1 + Math.round(reqTotal/3))*100);
    this.requestInterval = setInterval(() => this.reqTimeoutOver(), newDelay);
    let delayTime = now.getTime() + newDelay;
    console.log("Setting noRequestsUntil to " + delayTime);
    localStorage.setItem('noRequestsUntil', JSON.stringify(delayTime));
    reqTotal++;
    localStorage.setItem('requestTotal',JSON.stringify(reqTotal));
    //Set button tooltips
    this.buttonTooltip = UI_BTN_TOOLTIP_DISABLED;
  }

  /**
   * Check how much time is left in the current request delay
   */
  checkReqDelay() {
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
   * Toggle simple visibility flag of hamburger menu
   */
  toggleHamburgerMenu(): void {
    this.showMenu = !this.showMenu;
  }

  /**
   * Toggle simple visibility flag of Queue display
   * and disable visibility flags for New Arrivals component and hamburger menu
   */
  toggleQueue(): void {
    this.showQueue = !this.showQueue;
    this.showNew = false;
    this.showMenu = false;
  }  

  /**
   * Toggle simple visibility flag of New Arrivals component
   * and disable visibility flags for Queue display and hamburger menu
   */
  toggleNewArrivals(): void {
    this.showNew = !this.showNew;
    this.showQueue = false;
    this.showMenu = false;
  }

  /**
   * Set all visibility flags to false
   */
  resetView(): void {
    this.showNew = false;
    this.showQueue = false;
    this.showMenu = false;
  }

  /**
   * Toggle visibility flag for "Help" display
   * and disable visiblity flag for hamburger menu
   */
  toggleHelpText(): void {
    this.showHelp = !this.showHelp;
    this.showMenu = false;
  }

  /**
   * Determine color scheme from browser setting (default)
   * or one that the user has selected (from local storage)
   */
  detectColorScheme(): void {
    let theme: string = "Dark Theme";
    let ls_theme = localStorage.getItem("theme");
    if (!this.lightTheme) {
      theme = "Dark Theme";
    }
    if (ls_theme) {
      theme = ls_theme;
    } else {
      if (window.matchMedia("(prefers-color-scheme: light").matches) {
        this.lightTheme = true;
        theme = "Light Theme";
      }
    }
    document.documentElement.setAttribute("data-theme", theme);
  }

  /**
   * Manually switch theme to light or dark
   */
  toggleTheme(): void {
    let theme: string = "Dark Theme";
    this.lightTheme = !this.lightTheme;

    if (this.lightTheme) {
      theme = "Light Theme";
      this.themeButton = "Dark Theme";
    } else {
      theme = "Dark Theme";
      this.themeButton = "Light Theme";
    }
    
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }

  /**
   * Read variable for current track progress
   * and increment it if it's below the set threshold for the track being "done",
   * or take the appropriate action if the threshold has been reached
   */
  incrementProgressBar() {
    let progressDiv = document.querySelector("#pAutoDj .playlistDiv div:last-child .trackProgressBar");
    if (this.currentTrackProgress<98) {
      this.currentTrackProgress++
      //console.log(this.currentTrackProgress);
    } else {
      // If progress is >=98%, wait 3% longer and then trigger component INIT (which eventually starts this again)
      console.log("clearing interval");
      this.libraryDataService.setQueueOutdated(true);
      this.currentTrackProgress=0;
      setTimeout(() => this.getQueue(), this.currentTrackDuration*30); // duration * 1000 converts to ms, /100 increments, *2 for 2 increments
    } 
    let style = "display:inline-block;width:" + this.currentTrackProgress + "%";
    progressDiv?.setAttribute("style", style);
  }

    /**
   * Reset request timeout variables when time's up
   */
    reqTimeoutOver() {
      this.justRequested = "";
      clearInterval(this.requestInterval);
      this.buttonTooltip = "";
    }
  
    reqToast() {
      this.showReqToast = true;
      this.toastInterval = setInterval(() => {this.showReqToast = false; clearInterval(this.toastInterval)}, 2000);
    }

}
