import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SrsDialogComponent } from './srs-dialog.component';

describe('SrsDialogComponent', () => {
  let component: SrsDialogComponent;
  let fixture: ComponentFixture<SrsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SrsDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SrsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
