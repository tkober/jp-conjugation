import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SrsProgressComponent } from './srs-progress.component';

describe('SrsProgressComponent', () => {
  let component: SrsProgressComponent;
  let fixture: ComponentFixture<SrsProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SrsProgressComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SrsProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
