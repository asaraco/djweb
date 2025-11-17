import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { API_URL, CRATES_HIDDEN } from 'src/app/app.constants';
import { OnlineResult } from 'src/app/library/library.component';
import { Track } from 'src/app/track/track.component';

@Injectable({
  providedIn: 'root'
})
export class LibraryDataService {
  private currentUpload = new Subject<boolean>();
  // AMS 10/25/2024 - trying some flags
  private libraryOutdated: boolean = true;
  private queueOutdated: boolean = true;
  private uploadsOutdated: boolean = true;
  public isLibraryOutdated(): boolean {
    return this.libraryOutdated;
  }
  public setLibraryOutdated(flag: boolean) {
    this.libraryOutdated = flag;
  }
  public isQueueOutdated(): boolean {
    return this.queueOutdated;
  }
  public setQueueOutdated(flag: boolean) {
    this.queueOutdated = flag;
  }
  public isUploadsOutdated(): boolean {
    return this.uploadsOutdated;
  }
  public setUploadsOutdated(flag: boolean) {
    this.uploadsOutdated = flag;
  }
  /**
   * Trigger an update to the "current upload" Subject (Observable)
   * creating a new boolean object
   * which observers will detect and use as needed
   */
  notifyOfUpload() {
    this.currentUpload.next(true);
  }

  /**
   * Observe "current upload" Subject to detect when it changes
   * @returns Observable<boolean>
   */
  watchForUpload(): Observable<boolean> {
    return this.currentUpload.asObservable();
  }

  /**
   * Constructor.
   * @param http HttpClient (injection)
   */
  constructor(
    private http: HttpClient
  ) { }

  /* AMS - I don't like using "any" as the type instead of "Track[]", but due to using JPA/HAL
  the JSON response has an "_embedded" wrapper for the tracks array */

  retrieveAllTracks(): Observable<any> {
    //return this.http.get<Track[]>(`${API_URL}/tracks/search/findByCratesIdNotInOrderBySortArtistAscAlbumAsc?crateids=${CRATES_HIDDEN}`)
    return this.http.get<Track[]>(`${API_URL}/getRatedTracks`)
  }
  
  retrieveNewTracks(): Observable<any> {
    //return this.http.get<Track[]>(`${API_URL}/tracks/search/findAllByCratesIsNull`)
    return this.http.get<Track[]>(`${API_URL}/getUnratedLocalTracks`)
  }

  retrieveRecentTracks(): Observable<any> {
    return this.http.get<Track[]>(`${API_URL}/getRatedRecentTracks`);
  }

  deezerSearch(query: string): Observable<OnlineResult[]> {
    return this.http.get<OnlineResult[]>(`${API_URL}/deezerSearch?query=${query}`);
  }

  forceReloadAll(): Observable<any> {
    return this.http.get<any>(`${API_URL}/forceReloadDatabase`);
  }
}
