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
      setInterval(() => this.ngOnInit(), this.currentTrackDuration * 750);
    }

  ngOnInit(): void {
    this.detectColorScheme();
    /* AMS - The JSON response for Playlist includes some other stuff auto-generated by JPA/HAL, 
    so a tiny bit of manual assignment is needed. */
    /*
    this.playlistDataService.retrieveMostRecentPlaylist().subscribe(data => {
      //console.log("Getting most recent playlist");
      //this.mostRecentPlaylist = new Playlist(data.id);
      this.mostRecentPlaylist.name = data.name;
      this.mostRecentPlaylist.playlistTracks = data._embedded.playlistTracks;
      let currentTrackDuration = data._embedded.playlistTracks[0].track.duration;
      //console.log("current track duration: " + currentTrackDuration);
    });
    this.playlistDataService.retrievePlaylist(1).subscribe(data => {
      //this.autoDjPlaylist = new Playlist(1);
      this.autoDjPlaylist.name = data.name;
      this.autoDjPlaylist.playlistTracks = data._embedded.playlistTracks;
    });
    */
    this.playlistDataService.retrieveAutomixQueue().subscribe(data => {
      this.autoDjPlaylist.name = data.name;
      this.autoDjPlaylist.playlistTracks = data.playlistTracks.splice(1,5).reverse();
    })
    this.playlistDataService.retrieveLastPlayed().subscribe(data => {
      this.mostRecentPlaylist.name = data.name;
      this.mostRecentPlaylist.playlistTracks = data.playlistTracks.reverse();
      let currentTrackDuration = this.mostRecentPlaylist.playlistTracks[0].track.duration;
    })
    // AMS 2023/10/16 - Retrieve or randomly generate a user ID # for this session.
    //                  Also store in array to make sure there are no duplicates.
    if (!localStorage.getItem('userNumber')) {
      this.userDataService.generateID().subscribe(data => {
        localStorage.setItem('userNumber', JSON.stringify(data));
        //console.log("Assigned User #: " + localStorage.getItem('userNumber'));
        //this.firstTime = true;
        this.showHelp = true;
        localStorage.setItem('requestTotal', '0');
      });
    }
  }

  @HostListener("window:scroll", [])
  onWindowScroll() {
    const number = document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (number > 0) {
      this.scrolledDown = true;
    } else {
      this.scrolledDown = false;
    }
  }

  toggleHamburgerMenu(): void {
    this.showMenu = !this.showMenu;
  }

  toggleQueue(): void {
    this.showQueue = !this.showQueue;
    this.showNew = false;
    this.showMenu = false;
  }  

  toggleNewArrivals(): void {
    this.showNew = !this.showNew;
    this.showQueue = false;
    this.showMenu = false;
  }

  resetView(): void {
    this.showNew = false;
    this.showQueue = false;
    this.showMenu = false;
  }

  toggleHelpText(): void {
    this.showHelp = !this.showHelp;
    this.showMenu = false;
  }

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

}
