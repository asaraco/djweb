import { Injectable } from '@angular/core';
import { API_URL } from 'src/app/app.constants';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Playlist } from 'src/app/playlist/playlist.component';
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

  notifyOfRequest(duration: number, reqTotal: number, refreshLibrary: boolean) {
    let pr = new PlaylistRequest(duration, reqTotal, refreshLibrary);
    this.currentRequest.next(pr);
  }

  watchForNotification(): Observable<PlaylistRequest> {
    return this.currentRequest.asObservable();
  }

  constructor( 
    private http: HttpClient 
    ) { }

  /* AMS - I don't like using "any" as the type instead of "Playlist", but due to using JPA/HAL
  the JSON response is not just a Playlist, it also has an "_embedded" wrapper
  for the playlistTracks array, and other generated stuff. So a bit more manual handling is needed. */
  retrievePlaylist(id: number): Observable<any> {
    return this.http.get<Playlist>(`${API_URL}/playlists/${id}`);
  }

  retrieveMostRecentPlaylist(): Observable<any> {
    return this.http.get<Playlist>(`${API_URL}/playlists/search/findTopByOrderByIdDesc`);
  }

  retrieveHighestPlaylistTrack(id: number): Observable<Track> {
    return this.http.get<Track>(`${API_URL}playlistTracks/search/findFirstByPlaylistIdOrderByPositionDesc?playlistId=${id}`);
  }

  retrieveAutomixQueue(): Observable<Playlist> {
    return this.http.get<Playlist>(`${API_URL}/getQueue`);
  }

  retrieveLastPlayed(): Observable<Playlist> {
    return this.http.get<Playlist>(`${API_URL}/getPlayHistory`);
  }

  requestTrack(id: number): Observable<string> {
    var responseMsg: string;
    return this.http.post<string>(`${API_URL}/requestSong?id=${id}`, null);
  }

  requestFile(path: string): Observable<string> {
    var req: SongRequest = new SongRequest(path);
    return this.http.post<string>(`${API_URL}/requestDirect`, req);
  }

  requestTrackCrate(songid: number, crateid: string): Observable<string> {
    var responseMsg: string;
    return this.http.post<string>(`${API_URL}/requestSongCrate?songid=${songid}&crateid=${crateid}`, null);
  }

  requestTrackAndAskTheDJ(id: number): Observable<string> {
    var songInfo: string;
    return this.http.post<string>(`${API_URL}/findSongByIdForAskTheDJ?id=${id}`, null);
  }

  requestAskTheDJ(message: string): Observable<string> {
    return this.http.post<string>(`${API_URL}/requestAskTheDJ?message=${message}`, null);
  }
}
