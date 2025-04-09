import { Component, OnInit } from '@angular/core';
import {MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'app-srs-dialog',
  templateUrl: './srs-dialog.component.html',
  styleUrls: ['./srs-dialog.component.css']
})
export class SrsDialogComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<SrsDialogComponent>) {

   }

  ngOnInit(): void {

  }

  public close() {
    this.dialogRef.close();
  }

}
