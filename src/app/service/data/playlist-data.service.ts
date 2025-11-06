import { Injectable } from '@angular/core';
import { API_URL } from 'src/app/app.constants';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Playlist, PlaylistQueue } from 'src/app/playlist/playlist.component';
import { Track } from 'src/app/track/track.component';
import { PlaylistTrack } from 'src/app/playlist-track/playlist-track.component';
import { SongRequest } from 'src/app/library/library.component';

export class PlaylistRequest {
  constructor(public duration: number, public reqTotal: number, public triggerRefresh: boolean) {}
}

@Injectable({
  providedIn: 'root'
})
export class PlaylistDataService {
  private currentRequest = new Subject<PlaylistRequest>();

  /**
   * Trigger an update to the "current request" Subject (Observable)
   * creating a new PlaylistRequest object
   * which observers will detect and use as needed
   * @param duration Duration of the requested track
   * @param reqTotal Cumulative total # of requests for this session user
   * @param refreshLibrary Whether the library view needs to be refreshed (used when handling newly uploaded songs)
   */
  notifyOfRequest(duration: number, reqTotal: number, refreshLibrary: boolean) {
    let pr = new PlaylistRequest(duration, reqTotal, refreshLibrary);
    this.currentRequest.next(pr);
  }

  /**
   * Observe "current request" Subject to detect when it changes
   * @returns Observable<PlaylistRequest>
   */
  watchForNotification(): Observable<PlaylistRequest> {
    return this.currentRequest.asObservable();
  }

  /**
   * Constructor.
   * @param http HttpClient (injection)
   */
  constructor( 
    private http: HttpClient 
    ) { }

    /**
     * Retrieve queue of upcoming songs (and possibly current song)
     * @returns Observable<PLaylistQueue>
     */
  retrieveAutomixQueue(): Observable<PlaylistQueue> {
    return this.http.get<PlaylistQueue>(`${API_URL}/getQueue`);
  }

  /**
   * Retrieve queue of recently played songs (and possibly current song)
   * @returns Observable<Playlist>
   */
  retrieveLastPlayed(): Observable<Playlist> {
    return this.http.get<Playlist>(`${API_URL}/getPlayHistory`);
  }

  /**
   * Request a song using Track metadata
   * @param track Track - use filePath, title, & artist properties
   * @param rated boolean - different behavior depending on whether track is already rated (if not, it's a new upload)
   * @param userid string - name or other ID of user making the request
   * @returns Observable<string>
   */
  requestFile(track: Track, rated: boolean, userid: string): Observable<string> {
    var req: SongRequest = new SongRequest(track.filePath, track.title, track.artist, track.duration, rated, userid);
    return this.http.post<string>(`${API_URL}/requestDirect`, req);
  }  

  /**
   * Sends a request string to VirtualDJ's "Ask the DJ" service
   * as well as a "username" parameter (not too important to functionality)
   * @param message string - plaintext song request or other message
   * @param userid string - name or other ID of user making the request
   * @returns Observable<string>
   */
  requestAskTheDJ(message: string, userid: string): Observable<string> {
    return this.http.post<string>(`${API_URL}/requestAskTheDJ?message=${message}&name=${userid}`, null);
  }

  /**
   * Get time remaining in currently playing song
   * @returns Observable<number> - Remaining time in ms
   */
  getTimeRemaining(): Observable<number> {
    return this.http.get<number>(`${API_URL}/getTimeRemaining`);
  }

  /**
   * Get progress of currently playing song
   * @returns Observable<number> - Percentage of song completed
   */
  getSongProgress(): Observable<number> {
    return this.http.get<number>(`${API_URL}/getSongPosition`);
  }

  /**
   * Request a song using its ID #
   * (NOT RELIABLE FOR VDJ - ID's are generated and not stored)
   * @param id 
   * @returns Observable<string>
   */
  requestTrack(id: number): Observable<string> {
    var responseMsg: string;
    return this.http.post<string>(`${API_URL}/requestSong?id=${id}`, null);
  }

  /**
   * Request a song using its ID #
   * and VirtualDJ's "Ask the DJ" service
   * (NOT RELIABLE - ID's are generated and not stored)
   * @param id 
   * @param username 
   * @returns 
   */
  requestTrackAndAskTheDJ(id: number, username: string): Observable<string> {
    var songInfo: string;
    return this.http.post<string>(`${API_URL}/findSongByIdForAskTheDJ?id=${id}&name=${username}`, null);
  }

  /* Methods used with MIXXX only */

  /* AMS - I don't like using "any" as the type instead of "Playlist", but due to using JPA/HAL
  the JSON response is not just a Playlist, it also has an "_embedded" wrapper
  for the playlistTracks array, and other generated stuff. So a bit more manual handling is needed. */
  retrieveMixxxPlaylist(id: number): Observable<any> {
    return this.http.get<Playlist>(`${API_URL}/playlists/${id}`);
  }

  retrieveMixxxMostRecentPlaylist(): Observable<any> {
    return this.http.get<Playlist>(`${API_URL}/playlists/search/findTopByOrderByIdDesc`);
  }

  retrieveMixxxHighestPlaylistTrack(id: number): Observable<Track> {
    return this.http.get<Track>(`${API_URL}playlistTracks/search/findFirstByPlaylistIdOrderByPositionDesc?playlistId=${id}`);
  }

  requestMixxxTrackCrate(songid: number, crateid: string): Observable<string> {
    var responseMsg: string;
    return this.http.post<string>(`${API_URL}/requestSongCrate?songid=${songid}&crateid=${crateid}`, null);
  }
}
