import { Component, Input, OnInit } from '@angular/core';
import { WordType } from '../conjugation/conjugation';
import { SrsItem, SrsService } from '../services/srs.service';

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

  public srsState: SrsItem;

  constructor(private srsService: SrsService) { }

  ngOnInit(): void {
    this.srsState = this.srsService.stateForForm(this.progressItem.srsKey);
  }

}
