import { Component, HostListener, OnInit } from '@angular/core';
import { PlaylistDataService } from './service/data/playlist-data.service';
import { UserDataService } from './service/data/user-data.service';
import { Playlist } from './playlist/playlist.component';
import { Subscription } from 'rxjs';
import { UI_HELPTEXT_REQUEST, UI_HELPTEXT_UPLOAD, UI_WELCOME_TEXT } from './app.constants';

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
  showMenu: boolean = false;
  showQueue: boolean = false;  
  showNew: boolean = false;
  firstTime: boolean = false;
  showHelp: boolean = false;
  scrolledDown: boolean = false;
  requestSubscription: Subscription;
  currentTrackDuration: number = 100;
  currentTrackProgress!: number;
  progressBarInterval!: any;
  /* imported constants */
  UI_WELCOME_TEXT: string = UI_WELCOME_TEXT;
  UI_HELPTEXT_REQUEST: string = UI_HELPTEXT_REQUEST;
  UI_HELPTEXT_UPLOAD: string = UI_HELPTEXT_UPLOAD;

  constructor(
    private playlistDataService: PlaylistDataService,
    private userDataService: UserDataService
    ){
      this.requestSubscription = this.playlistDataService.watchForNotification().subscribe((data) => {
        this.ngOnInit();
      });
      // Set how often to refresh queue
      // AMS 2024/10/16 - Now attempting to set this within ngOnInit() below, via "get_time"
      //setInterval(() => this.ngOnInit(), this.currentTrackDuration * 750);
      
    }

  ngOnInit(): void {
    console.log("APP COMPONENT INIT");
    this.detectColorScheme();
    /*** VDJ - "Automix" and most recent "History" M3U file */
    // For VDJ, 1st track of Automix Queue is the most reliable way of getting "current track"
    // (though it is also the last track of the latest M3U, but they refresh at different times)
    this.playlistDataService.retrieveAutomixQueue().subscribe(data => {
      this.autoDjPlaylist.name = data.name;
      this.autoDjPlaylist.playlistTracks = data.playlistTracks.splice(0,5).reverse();
      /* --- PROGRESS BAR --- */
      this.currentTrackDuration = data.currentTrackDurationSec;
      console.log("currentTrackDuration = " + this.currentTrackDuration);
      this.currentTrackProgress = data.currentTrackProgress * 100;  // fraction of 1.0, convert to percentage
      console.log("currentTrackProgress = " + this.currentTrackProgress);
      let remainingTimeMs = data.currentTrackRemainingMs;
      console.log("remaining time = " + remainingTimeMs);
      // If duration is 0, default it to the time remaining instead -- better than nothing, literally
      if (this.currentTrackDuration==0) {
        this.currentTrackDuration = remainingTimeMs/1000;
        console.log("defaulting currentTrackDuration to " + this.currentTrackDuration);
      }
      // Set current track progress bar interval, as well as refresh interval
      clearInterval(this.progressBarInterval);
      this.progressBarInterval = setInterval(() => this.incrementProgressBar(), this.currentTrackDuration*10); // *10 achieves "*1000" to convert to ms, then /100
    })
    // History playlist
    this.playlistDataService.retrieveLastPlayed().subscribe(data => {
      this.mostRecentPlaylist.name = data.name;
      this.mostRecentPlaylist.playlistTracks = data.playlistTracks.reverse().splice(1);
      
    })
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
      console.log(this.currentTrackProgress);
    } else {
      // If progress is >=98%, wait 3% longer and then trigger component INIT (which eventually starts this again)
      console.log("clearing interval");
      this.currentTrackProgress=0;
      setTimeout(() => this.ngOnInit(), this.currentTrackDuration*30); // duration * 1000 converts to ms, /100 increments, *2 for 2 increments
    } 
    let style = "display:inline-block;width:" + this.currentTrackProgress + "%";
    progressDiv?.setAttribute("style", style);
  }

}
