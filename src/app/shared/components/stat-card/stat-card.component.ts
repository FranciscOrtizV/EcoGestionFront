import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgClass],
  templateUrl: './stat-card.component.html',
})
export class StatCardComponent {
  title = input.required<string>();
  value = input.required<string | number>();
  valueClass = input<string>('');
  cardClass = input<string>('');
}
