import { NgClass } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebcamImage, WebcamInitError, WebcamModule } from 'ngx-webcam';
import { toast } from 'ngx-sonner';
import { Subject, catchError, EMPTY, finalize } from 'rxjs';
import { EjecucionRutasService } from '../../../../core/services/ejecucion-rutas.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { EstadoEjecucionPuntoRutaEnum } from '../../../../shared/enums/EstadoEjecucionPuntoRuta.enum';

const ESTADO_PUNTO_OPCIONES: readonly {
  value: EstadoEjecucionPuntoRutaEnum;
  label: string;
}[] = [
  { value: EstadoEjecucionPuntoRutaEnum.COMPLETADO, label: 'Completado' },
  { value: EstadoEjecucionPuntoRutaEnum.SALTADO, label: 'Saltado' },
  { value: EstadoEjecucionPuntoRutaEnum.FALLIDO, label: 'Fallido' },
];

function estadoRequiereComentarios(estado: EstadoEjecucionPuntoRutaEnum): boolean {
  return (
    estado === EstadoEjecucionPuntoRutaEnum.COMPLETADO ||
    estado === EstadoEjecucionPuntoRutaEnum.FALLIDO
  );
}

function estadoRequiereEvidenciaFoto(estado: EstadoEjecucionPuntoRutaEnum): boolean {
  return estado !== EstadoEjecucionPuntoRutaEnum.SALTADO;
}

@Component({
  selector: 'app-actualizar-estado-punto-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, WebcamModule],
  templateUrl: './actualizar-estado-punto-modal.component.html',
})
export class ActualizarEstadoPuntoModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ejecucionRutasService = inject(EjecucionRutasService);
  private readonly loadingService = inject(LoadingService);
  private readonly triggerCaptura = new Subject<void>();

  readonly ejecucionRutaId = input.required<string>();
  readonly puntoId = input.required<string>();
  readonly puntoNombre = input.required<string>();
  readonly estadoInicial = input<EstadoEjecucionPuntoRutaEnum>(
    EstadoEjecucionPuntoRutaEnum.PENDIENTE,
  );
  readonly comentariosIniciales = input<string | null>(null);
  /** Si se define, reemplaza `estadoInicial` al abrir el formulario (p. ej. COMPLETADO). */
  readonly estadoPredeterminado = input<EstadoEjecucionPuntoRutaEnum | null>(null);

  cancelled = output<void>();
  actualizado = output<void>();

  protected readonly opcionesEstado = ESTADO_PUNTO_OPCIONES;
  protected readonly mostrarCamara = signal(false);
  protected readonly fotoPreview = signal<string | null>(null);
  protected readonly triggerCaptura$ = this.triggerCaptura.asObservable();

  readonly form = this.fb.nonNullable.group({
    estado: [EstadoEjecucionPuntoRutaEnum.COMPLETADO, Validators.required],
    comentarios: [''],
    evidenciaFoto: [''],
  });

  ngOnInit(): void {
    let estado = this.estadoPredeterminado() ?? this.estadoInicial();
    if (estado === EstadoEjecucionPuntoRutaEnum.PENDIENTE) {
      estado = EstadoEjecucionPuntoRutaEnum.COMPLETADO;
    }
    this.form.patchValue({
      estado,
      comentarios: this.comentariosIniciales() ?? '',
    });
    this.aplicarValidacionesPorEstado(estado);

    this.form.controls.estado.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nuevoEstado) => this.aplicarValidacionesPorEstado(nuevoEstado));
  }

  protected comentariosSonRequeridos(): boolean {
    return estadoRequiereComentarios(this.form.controls.estado.value);
  }

  protected evidenciaFotoEsRequerida(): boolean {
    return estadoRequiereEvidenciaFoto(this.form.controls.estado.value);
  }

  private aplicarValidacionesPorEstado(estado: EstadoEjecucionPuntoRutaEnum): void {
    const comentarios = this.form.controls.comentarios;
    if (estadoRequiereComentarios(estado)) {
      comentarios.setValidators([Validators.required, Validators.pattern(/\S/)]);
    } else {
      comentarios.clearValidators();
    }
    comentarios.updateValueAndValidity({ emitEvent: false });

    const evidenciaFoto = this.form.controls.evidenciaFoto;
    if (estadoRequiereEvidenciaFoto(estado)) {
      evidenciaFoto.setValidators(Validators.required);
    } else {
      evidenciaFoto.clearValidators();
    }
    evidenciaFoto.updateValueAndValidity({ emitEvent: false });
  }
  protected abrirCamara(): void {
    this.mostrarCamara.set(true);
  }

  protected cerrarCamara(): void {
    this.mostrarCamara.set(false);
  }

  protected tomarFoto(): void {
    this.triggerCaptura.next();
  }

  protected onFotoCapturada(image: WebcamImage): void {
    this.fotoPreview.set(image.imageAsDataUrl);
    this.form.patchValue({ evidenciaFoto: image.imageAsBase64 });
    this.form.controls.evidenciaFoto.markAsTouched();
    this.mostrarCamara.set(false);
  }

  protected onErrorCamara(error: WebcamInitError): void {
    const mensajes: Record<string, string> = {
      NotAllowedError: 'Permiso de cámara denegado. Habilítalo en el navegador.',
      NotFoundError: 'No se encontró ninguna cámara en el dispositivo.',
      NotReadableError: 'La cámara está en uso por otra aplicación.',
    };
    toast.error(mensajes[error.mediaStreamError.name] ?? 'No se pudo acceder a la cámara.');
    this.mostrarCamara.set(false);
  }

  protected quitarFoto(): void {
    this.fotoPreview.set(null);
    this.form.patchValue({ evidenciaFoto: '' });
    this.form.controls.evidenciaFoto.markAsTouched();
  }

  protected volverATomarFoto(): void {
    this.quitarFoto();
    this.mostrarCamara.set(true);
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.warning('Revisa los campos obligatorios del formulario.');
      return;
    }

    const raw = this.form.getRawValue();
    const comentarios = raw.comentarios.trim();

    this.loadingService.setLoading(true);
    this.ejecucionRutasService
      .actualizarEstadoPunto(this.ejecucionRutaId(), this.puntoId(), {
        estado: raw.estado,
        comentarios: comentarios === '' ? null : comentarios,
        evidenciaFoto: raw.evidenciaFoto === '' ? null : raw.evidenciaFoto,
      })
      .pipe(
        catchError(() => {
          toast.error('No se pudo actualizar el estado del punto. Inténtalo de nuevo.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Estado del punto actualizado.');
        this.actualizado.emit();
      });
  }

  protected fieldInvalid(name: 'estado' | 'comentarios' | 'evidenciaFoto'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}
