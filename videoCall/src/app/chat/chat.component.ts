import { Component, ElementRef, ViewChild, viewChild } from '@angular/core';
import { MatGridListModule, MatGridTile } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../service/data.service';
import { message } from '../types/message';

const mediaConstraints = {
  audio: true,
  video: { width: 720, height: 540 },
};

const offerOptions = {
  offerToReceiveVideo: true,
  offerToReceiveAudio: true,
};
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [MatGridListModule, MatGridTile, MatButtonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent {
 
  @ViewChild('local_video') localVideo!: ElementRef;
  @ViewChild('received_video') remoteVideo!: ElementRef;

  private peerConnection: RTCPeerConnection | null=null

  private localStream!: MediaStream;

  inCall = false;
  localVideoActive = false;


  constructor(private dataService: DataService) { }

  async call(): Promise<void> {
    this.createPeerConnection();

    // Add the tracks from the local stream to the RTCPeerConnection
    this.localStream.getTracks().forEach(
      track => this.peerConnection?.addTrack(track, this.localStream)
    );

    try {
      const offer: RTCSessionDescriptionInit | undefined = await this.peerConnection?.createOffer(offerOptions);
      // Establish the offer as the local peer's current description.
      await this.peerConnection?.setLocalDescription(offer);

      this.inCall = true;

      this.dataService.sendMessage({type: 'offer', data: offer});
    } catch (err:any) {
      this.handleGetUserMediaError(err);
    }
  }

  hangUp(): void {
    this.dataService.sendMessage({type: 'hangup', data: ''});
    this.closeVideoCall();
  }

  ngAfterViewInit(): void {
    this.addIncominMessageHandler();
    this.requestMediaDevices();
  }

  private addIncominMessageHandler(): void {
    this.dataService.connect();

    // this.transactions$.subscribe();
    this.dataService.message$.subscribe(
      msg => {
        // console.log('Received message: ' + msg.type);
        switch (msg.type) {
          case 'offer':
            this.handleOfferMessage(msg.data);
            break;
          case 'answer':
            this.handleAnswerMessage(msg.data);
            break;
          case 'hangup':
            this.handleHangupMessage(msg);
            break;
          case 'ice-candidate':
            this.handleICECandidateMessage(msg.data);
            break;
          default:
            console.log('unknown message of type ' + msg.type);
        }
      },
      error => console.log(error)
    );
  }

  /* ########################  MESSAGE HANDLER  ################################## */

  private handleOfferMessage(msg: RTCSessionDescriptionInit): void {
    console.log('handle incoming offer');
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    if (!this.localStream) {
      this.startLocalVideo();
    }

    this.peerConnection?.setRemoteDescription(new RTCSessionDescription(msg))
      .then(() => {

        // add media stream to local video
        this.localVideo.nativeElement.srcObject = this.localStream;

        // add media tracks to remote connection
        this.localStream.getTracks().forEach(
          track => this.peerConnection?.addTrack(track, this.localStream)
        );

      }).then(() => {

      // Build SDP for answer message
      return this.peerConnection?.createAnswer();

    }).then((answer) => {

      // Set local SDP
      return this.peerConnection?.setLocalDescription(answer);

    }).then(() => {

      // Send local SDP to remote party
      this.dataService.sendMessage({type: 'answer', data: this.peerConnection?.localDescription});

      this.inCall = true;

    }).catch(this.handleGetUserMediaError);
  }

  private handleAnswerMessage(msg: RTCSessionDescriptionInit): void {
    console.log('handle incoming answer');
    this.peerConnection?.setRemoteDescription(msg);
  }

  private handleHangupMessage(msg: message): void {
    console.log(msg);
    this.closeVideoCall();
  }

  private handleICECandidateMessage(msg: RTCIceCandidate): void {
    const candidate = new RTCIceCandidate(msg);
    this.peerConnection?.addIceCandidate(candidate).catch(this.reportError);
  }

  private async requestMediaDevices(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      // pause all tracks
      this.pauseLocalVideo();
    } catch (e:any) {
      console.error(e);
      alert(`getUserMedia() error: ${e.name}`);
    }
  }

  startLocalVideo(): void {
    console.log('starting local stream');
    this.localStream.getTracks().forEach(track => {
      track.enabled = true;
    });
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.localVideoActive = true;
  }

  pauseLocalVideo(): void {
    console.log('pause local stream');
    this.localStream.getTracks().forEach(track => {
      track.enabled = false;
    });
    this.localVideo.nativeElement.srcObject = undefined;

    this.localVideoActive = false;
  }

 private createPeerConnection(): void {
  if (!this.peerConnection) {  // Only create if it's null
    console.log('Creating PeerConnection...');
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: ['stun:stun1.l.google.com:19302']
        }
      ]
    });

    // Add event handlers after creation
    this.peerConnection.onicecandidate = this.handleICECandidateEvent;
    this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
    this.peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    this.peerConnection.ontrack = this.handleTrackEvent;
  }
}


  private closeVideoCall(): void {
    console.log('Closing call');
    if (this.peerConnection) {
      console.log('--> Closing the peer connection');
  
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
  
      // Stop all transceivers
      this.peerConnection.getTransceivers().forEach(transceiver => transceiver.stop());
  
      // Close the peer connection
      this.peerConnection.close();
      this.peerConnection = null;  // Set to null
    }
  
    this.inCall = false;
  }
  
  /* ########################  ERROR HANDLER  ################################## */
  private handleGetUserMediaError(e: Error): void {
    switch (e.name) {
      case 'NotFoundError':
        alert('Unable to open your call because no camera and/or microphone were found.');
        break;
      case 'SecurityError':
      case 'PermissionDeniedError':
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        console.log(e);
        alert('Error opening your camera and/or microphone: ' + e.message);
        break;
    }

    this.closeVideoCall();
  }

  private reportError = (e: Error) => {
    console.log('got Error: ' + e.name);
    console.log(e);
  }

  /* ########################  EVENT HANDLER  ################################## */
  private handleICECandidateEvent = (event: RTCPeerConnectionIceEvent) => {
    console.log(event);
    if (event.candidate) {
      this.dataService.sendMessage({
        type: 'ice-candidate',
        data: event.candidate
      });
    }
  }

  private handleICEConnectionStateChangeEvent = (event: Event) => {
    console.log(event);
    switch (this.peerConnection?.iceConnectionState) {
      case 'closed':
      case 'failed':
      case 'disconnected':
        this.closeVideoCall();
        break;
    }
  }

  private handleSignalingStateChangeEvent = (event: Event) => {
    console.log(event);
    switch (this.peerConnection?.signalingState) {
      case 'closed':
        this.closeVideoCall();
        break;
    }
  }

  private handleTrackEvent = (event: RTCTrackEvent) => {
    console.log(event);
    this.remoteVideo.nativeElement.srcObject = event.streams[0];
  }
}
