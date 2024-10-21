import { Component } from '@angular/core';
import {MatGridListModule, MatGridTile} from '@angular/material/grid-list';
import {MatButtonModule} from '@angular/material/button';

const mediaConstraints={
  audio:true,
  video:{width:720,height:540}
}
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [MatGridListModule,MatGridTile,MatButtonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
   private localStream!:MediaStream

   constructor(){}

   ngAfterViewInit():void{
    
   }
}
