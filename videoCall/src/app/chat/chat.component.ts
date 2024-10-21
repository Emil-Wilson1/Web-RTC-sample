import { Component, ElementRef, ViewChild, viewChild } from '@angular/core';
import { MatGridListModule, MatGridTile } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';

const mediaConstraints = {
  audio: true,
  video: { width: 720, height: 540 },
};
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [MatGridListModule, MatGridTile, MatButtonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent {
  private localStream!: MediaStream;
  @ViewChild('local_video') localVideo!:ElementRef

  constructor() {}

  ngAfterViewInit(): void {
    this.requestMediaDevices();
  }

  private async requestMediaDevices(): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    this.pauseLocalVideo()
  }

  pauseLocalVideo():void{
    this.localStream.getTracks().forEach((track)=>{
      track.enabled=false;
    })
    this.localVideo.nativeElement.srcObject=null
  }

  startLocalVideo():void{
    this.localStream.getTracks().forEach((track)=>{
      track.enabled=true;
    })
    this.localVideo.nativeElement.srcObject=this.localStream
  }
}
