import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import FuzzySearch from 'fuzzy-search';
import { BsDropdownConfig } from 'ngx-bootstrap/dropdown';

import { ChecklistService } from './checklist.service';
import { TechniqueFilters } from './filters/technique-filters.model';
import { Technique } from './technique.model';

@Component({
  selector: 'app-bjj-checklist',
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.scss'],
  providers: [{ provide: BsDropdownConfig, useValue: { isAnimated: true, autoClose: true } }]
})
export class ChecklistComponent implements OnInit {
  user: firebase.User;
  userBtnExpanded = false;
  filters: TechniqueFilters;
  techniques: Technique[];
  techniquesFiltered: Technique[];

  constructor(
    private angularFireAuth: AngularFireAuth,
    private router: Router,
    private service: ChecklistService
  ) { }

  ngOnInit() {
    this.getLoggedInUser();
  }

  //////////////////////////////////////////

  routeToLogin(): void {
    this.router.navigate(['/login']);
  }

  signOut(): void {
    this.angularFireAuth.auth.signOut().then(() => {
      this.user = undefined;
      this.userBtnExpanded = false;
    }).catch(() => { });
  }

  onStatusChanged(technique: Technique): void {
    if (!this.user) { return; }
    if (technique.status.id) {
      this.service.updateStatus(technique);
    } else {
      this.service.createStatus(technique, this.user.uid);
    }
  }

  // Filtering

  onFiltersChanged(filters: TechniqueFilters): void {
    this.filters = filters;
    if (this.user) {
      this.service.updateFilters(filters, this.user.uid);
    }
    this.filter();
  }

  filter(): void {
    if (!this.filters || !this.techniques) { return; }
    const techniques = this.fuzzySearch();
    this.techniquesFiltered = techniques
      .filter(t => {
        const beltNames = this.filters.belt.filter(b => b.isFilter).map(f => f.name);
        return beltNames.length > 0 ? beltNames.includes(t.belt.name) : true;
      })
      .filter(t => {
        const giNames = this.filters.gi.filter(g => g.isFilter).map(f => f.name);
        return giNames.length > 0 ? giNames.includes(t.gi.name) : true;
      })
      .filter(t => {
        const positionsNames = this.filters.position.filter(f => f.isFilter).map(f => f.name);
        return positionsNames.length > 0 ? positionsNames.includes(t.position.name) : true;
      })
      .filter(t => {
        const placementNames = this.filters.placement.filter(f => f.isFilter).map(f => f.name);
        return placementNames.length > 0 ? placementNames.includes(t.placement.name) : true;
      })
      .filter(t => {
        const statusStatus = this.filters.status.filter(s => s.isFilter).map(s => s.status);
        return statusStatus.length > 0 ? statusStatus.includes(t.status.status) : true;
      });
  }

  /**
   * Sublime text inspired search on technique caption.
   * Returns list of techniques filtered by the fuzzy search.
   */
  fuzzySearch(): Technique[] {
    const fuzzySearch = new FuzzySearch(this.techniques, ['caption']);
    return fuzzySearch.search(this.filters.caption);
  }

  // Init functions

  private getLoggedInUser(): void {
    this.angularFireAuth.authState.subscribe((user: firebase.User) => {
      if (user) { this.user = user; }
      this.getTechniquesList();
    });
  }

  private getTechniquesList(): void {
    this.service.getTechniques().subscribe((results: Technique[]) => {
      this.techniques = this.techniquesFiltered = results;
      if (this.user) {
        this.setUserStatuses();
      } else {
        this.filter();
      }
    });
  }

  private setUserStatuses(): void {
    this.service.getStatuses(this.user.uid).subscribe(statusDtos => {
      statusDtos.forEach(statusDto => {
        this.techniques.forEach(technique => {
          technique.status.updateFormDto(statusDto);
        });
      });
      this.filter();
    });
  }

}
