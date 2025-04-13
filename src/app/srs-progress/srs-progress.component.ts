import { Component, Input, OnInit } from '@angular/core';
import { WordType } from '../conjugation/conjugation';

export class ProgressItem {
  constructor(
    public grammar: string,
    public form: string,
    public wordType: WordType,
    public srsKey: string
  ) { }
}

@Component({
  selector: 'srs-progress',
  templateUrl: './srs-progress.component.html',
  styleUrls: ['./srs-progress.component.css']
})
export class SrsProgressComponent implements OnInit {

  @Input() progressItem: ProgressItem;

  constructor() { }

  ngOnInit(): void {
  }

}
