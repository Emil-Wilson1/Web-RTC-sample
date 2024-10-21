import { Injectable } from '@angular/core';
import { message } from '../types/message';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject } from 'rxjs';

export const WS_ENDPOINT = 'ws://localhost:8081';
@Injectable({
  providedIn: 'root',
})
export class DataService {
  private socket$!: WebSocketSubject<any> | undefined;

  private messagesSubject = new Subject<message>();
  public message$ = this.messagesSubject.asObservable();


  public connect(): void {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = this.getNewWebSocket();
  
      this.socket$.subscribe({
        next: (msg) => {
          if (msg instanceof Blob) {
            // Handle Blob data
            this.handleBlobMessage(msg);
          } else {
            // Handle non-Blob data
            console.log('Received message of type: ' + msg.type);
            this.messagesSubject.next(msg);
          }
        },
        error: (err) => console.error('WebSocket error:', err),
        complete: () => console.log('WebSocket connection closed')
      });
    }
  }
  
  private handleBlobMessage(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        const jsonData = JSON.parse(text);
        console.log('Received message of type: ' + jsonData.type);
        this.messagesSubject.next(jsonData);
      } catch (error) {
        console.error('Error parsing Blob as JSON:', error);
      }
    };
    reader.onerror = (error) => console.error('Error reading blob:', error);
    reader.readAsText(blob);
  }

  sendMessage(msg: message): void {
    console.log('sending message: ' + msg.type);
    this.socket$?.next(msg);
  }

  /**
   * Return a custom WebSocket subject which reconnects after failure
   */
  private getNewWebSocket(): WebSocketSubject<any> {
    return webSocket({
      url: WS_ENDPOINT,
      openObserver: {
        next: () => {
          console.log('[DataService]: connection ok');
        }
      },
      closeObserver: {
        next: () => {
          console.log('[DataService]: connection closed');
          this.socket$ = undefined;
          this.connect();
        }
      },
      deserializer: (e) => e.data // This line is crucial
    });
  }
}
