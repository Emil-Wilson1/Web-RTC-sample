import { Injectable } from '@angular/core';
import { message } from '../types/message';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject } from 'rxjs';

export const WS_ENDPOINT = 'ws://localhost:8081';
@Injectable({
  providedIn: 'root',
})
export class DataService {
  private socket$!: WebSocketSubject<message> | null;

  private messageSubject = new Subject<message>();
  public message$ = this.messageSubject.asObservable();
  constructor() {}

  public connect(): void {

    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = this.getNewWebSocket();

      this.socket$.subscribe(
        // Called whenever there is a message from the server
        msg => {
          console.log('Received message of type: ' + msg.type);
          this.messageSubject.next(msg);
        }
      );
    }
  }
  sendMessage(msg: message): void {
    console.log('sending message: ' + msg.type);
    this.socket$?.next(msg);
  }

  private getNewWebSocket(): WebSocketSubject<any> {
    return webSocket({
      url: WS_ENDPOINT,
      openObserver: {
        next: () => {
          console.log('DataService: connection OK');
        },
      },
      closeObserver: {
        next: () => {
          console.log('DataService: connection CLOSED');
          this.socket$ = null;
          this.connect();
        },
      },
    });
  }
}
