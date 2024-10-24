import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { API_URL, UI_UPLOAD_ERROR_TEXT, UI_UPLOAD_SUCCESS_TEXT } from '../app.constants';
import { LibraryDataService } from '../service/data/library-data.service';
import { Track } from '../track/track.component';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  fileName: string = "";
  fileMessage: string[] = [];
  infoToast: boolean = false;
  errorToast: boolean = false;
  UI_UPLOAD_SUCCESS_TEXT: string = UI_UPLOAD_SUCCESS_TEXT;
  UI_UPLOAD_ERROR_TEXT: string = UI_UPLOAD_ERROR_TEXT;
  
  constructor(
    private http: HttpClient,
    private libraryDataService: LibraryDataService
  ) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.fileName = file.name;
      const formData = new FormData();
      formData.append("song", file);
      const upload$: any = this.http.post(`${API_URL}/upload`, formData);
      upload$.subscribe({
        next: (data: any) => {
          this.fileMessage = [data.message];
          this.fileMessage.push(UI_UPLOAD_SUCCESS_TEXT);
          this.infoToast = true;
          // AMS 10/23/2024 - trigger a refresh of the browser within VDJ to hopefully find the new song
          this.http.get(`${API_URL}/refreshSongBrowser`).subscribe(data => {
            console.log(data);
            if (data.toString().trim()=="true") {
              console.log("VDJ song browser refreshed, updating New Arrivals widget");
              //this.libraryDataService.retrieveNewTracks();
              const refresh$: any = this.http.get<Track[]>(`${API_URL}/getUnratedLocalTracks`).subscribe(data => {
                console.log(data);
                this.libraryDataService.notifyOfUpload();
              });
            } else {
              console.log("VDJ song browser upload may have failed, but song should still be uploaded");
            }            
          })          
        },
        error: (err: any)=> {
          this.fileMessage=[err.message];
          this.fileMessage.push(UI_UPLOAD_ERROR_TEXT);
          this.errorToast = true;
        }
      });
    }
  }
}
