import { ComponentFixture, inject, TestBed } from '@angular/core/testing';
import { ImageViewerComponent } from './image-viewer.component';
import { PrintService } from '../../print.service';
import { By } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, SimpleChange } from '@angular/core';
import { AnnotationsModule } from '../../annotations/annotations.module';
import { ToolbarEventService } from '../../toolbar/toolbar-event.service';
import { GrabNDragDirective } from '../grab-n-drag.directive';
import { Store, StoreModule } from '@ngrx/store';
import { reducers } from '../../store/reducers/reducers';
import { RouterTestingModule } from '@angular/router/testing';
import * as fromDocument from '../../store/actions/document.actions';
import { SelectedAnnotation } from '../../store/actions/annotation.actions';
import { of } from 'rxjs';
import { ViewerEventService } from '../viewer-event.service';

describe('ImageViewerComponent', () => {
  let component: ImageViewerComponent;
  let fixture: ComponentFixture<ImageViewerComponent>;
  let nativeElement;
  const DOCUMENT_URL = 'document-url';
  const event = { clientX: 50, clientY: 40, preventDefault: () => { }, target: { className: 'pageContainer' } };
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        ImageViewerComponent,
        GrabNDragDirective
      ],
      imports: [
        AnnotationsModule,
        StoreModule.forRoot({}),
        StoreModule.forFeature('media-viewer', reducers),
        RouterTestingModule
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageViewerComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.debugElement.nativeElement;
    component.url = DOCUMENT_URL;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should rotate image',
    inject([ToolbarEventService], (toolbarEvents: ToolbarEventService) => {
      toolbarEvents.rotateSubject.next(90);

      expect(component.rotation).toBe(90);
    }));

  describe('zoom operation', () => {

    it('should zoom image by factor of 0.5 ',
      inject([ToolbarEventService], (toolbarEvents: ToolbarEventService) => {
        toolbarEvents.zoomSubject.next(0.5);
        expect(component.zoom).toBe(0.5);
      }));

    it('should zoom image by factor of 2',
      inject([ToolbarEventService], (toolbarEvents: ToolbarEventService) => {
        toolbarEvents.zoomSubject.next(2);

        expect(component.zoom).toBe(2);
      }));

    it('should zoom image by maximum value 5',
      inject([ToolbarEventService], (toolbarEvents: ToolbarEventService) => {
        toolbarEvents.zoomSubject.next(5);
        toolbarEvents.stepZoomSubject.next(0.1);

        expect(component.zoom).toBe(5);
      }));

    it('should zoom image by minimum value 0.1',
      inject([ToolbarEventService], (toolbarEvents: ToolbarEventService) => {
        toolbarEvents.zoomSubject.next(0.1);
        toolbarEvents.stepZoomSubject.next(-0.1);

        expect(component.zoom).toBe(0.1);
      }));
  });

  it('should trigger print', inject([PrintService, ToolbarEventService],
    (printService: PrintService, toolbarEvents: ToolbarEventService) => {
      const printSpy = spyOn(printService, 'printDocumentNatively');
      toolbarEvents.printSubject.next();

      expect(printSpy).toHaveBeenCalledWith(DOCUMENT_URL);
    }));

  it('should trigger download',
    inject([ToolbarEventService], (toolbarEvents: ToolbarEventService) => {
      const anchor = document.createElement('a');
      spyOn(document, 'createElement').and.returnValue(anchor);
      component.downloadFileName = 'download-filename';

      toolbarEvents.downloadSubject.next();

      // tslint:disable-next-line
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(anchor.href).toContain(DOCUMENT_URL);
      expect(anchor.download).toBe('download-filename');
    }));

  it('when url changes the error message is reset', () => {
    component.errorMessage = 'errox';
    component.url = 'x';

    component.ngOnChanges({
      url: new SimpleChange('a', 'b', true)
    });

    expect(component.errorMessage).toBeNull();
  });

  it('on load error store error message', () => {
    component.url = 'x';

    component.onLoadError(component.url);

    expect(component.errorMessage).toContain('Could not load the image');
  });

  it('should show comments panel',
    inject([ToolbarEventService], (toolbarEvents: ToolbarEventService) => {
      component.showCommentsPanel = false;
      const imageContainer = fixture.debugElement.query(By.css('.image-container'));

      toolbarEvents.commentsPanelVisible.next(true);
      fixture.detectChanges();

      expect(component.showCommentsPanel).toBeTruthy();
      expect(imageContainer.nativeElement.className).toContain('show-comments-panel');
    }));

  it('should hide comments panel',
    inject([ToolbarEventService], (toolbarEvents: ToolbarEventService) => {
      component.showCommentsPanel = true;
      const imageContainer = fixture.debugElement.query(By.css('.image-container'));

      toolbarEvents.commentsPanelVisible.next(false);
      fixture.detectChanges();

      expect(component.showCommentsPanel).toBeFalsy();
      expect(imageContainer.nativeElement.className).not.toContain('show-comments-panel');
    }));

  it('should emit toggleCommentsSummary event', () => {
    const commentSummarySpy = spyOn(component.toolbarEvents.showCommentSummary, 'next');
    component.toggleCommentsSummary();
    expect(commentSummarySpy).toHaveBeenCalledWith(true);
  });

  it('should dispatch AddPages event', inject([Store], (store) => {
    spyOn(store, 'dispatch');
    const img = { offsetHeight: 100, offsetWidth: 50, offsetLeft: 20, offsetTop: 30 };
    const payload = [{
      div: { scrollHeight: 100, scrollWidth: 50, offsetLeft: 20 },
      pageNumber: 1,
      scale: 1,
      rotation: 0,
      id: 1
    }] as any;
    component.initAnnoPage(img);
    expect(store.dispatch).toHaveBeenCalledWith(new fromDocument.AddPages(payload));
  }));

  it('should dispatch AddPages event with relevant payload for 90 deg rotation',
    inject([Store], (store) => {
      spyOn(store, 'dispatch');
      component.rotation = 90;
      const img = { offsetHeight: 100, offsetWidth: 50, offsetLeft: 20, offsetTop: 30 };
      const payload = [{
        div: { scrollHeight: 50, scrollWidth: 100, offsetLeft: 30 },
        pageNumber: 1,
        scale: 1,
        rotation: 90,
        id: 1
      }] as any;
      component.initAnnoPage(img);
      expect(store.dispatch).toHaveBeenCalledWith(new fromDocument.AddPages(payload));
    })
  );

  it('should deselect annotation and context toolbar', inject([Store, ViewerEventService], (store, viewerEvents) => {
    spyOn(store, 'dispatch');
    spyOn(viewerEvents, 'clearCtxToolbar');
    component.onImageViewerClick(event as any);

    expect(store.dispatch).toHaveBeenCalledWith(new SelectedAnnotation({
      annotationId: '', selected: false, editable: false
    }));
    expect(viewerEvents.clearCtxToolbar).toHaveBeenCalled();
  })
  );
});
