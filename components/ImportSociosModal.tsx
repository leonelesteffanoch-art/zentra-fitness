'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Portal } from '@/components/Portal';
import { supabase } from '@/lib/supabase';
import { listarPlanes } from '@/services/sociosService';
import { diffDiasISO, formatearFechaDMY, hoyLima, soles, sumarDias } from '@/lib/formato';
import type { Plan } from '@/types';

interface Props {
  gymId: string;
  onClose: () => void;
  onDone: (mensaje: string) => void;
}

interface FilaCruda {
  filaNum: number;
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  planTexto: string;
  fechaInicioRaw: unknown;
  fechaFinRaw: unknown;
  saldo: number;
}

interface FilaEvaluada {
  filaNum: number;
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  plan: Plan | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  saldoPendiente: number;
  error: string | null;
}

function normalizarClave(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function separarNombreCompleto(nombreCompleto: string): { nombres: string; apellidos: string } {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return { nombres: partes[0] ?? '', apellidos: '' };
  if (partes.length === 2) return { nombres: partes[0], apellidos: partes[1] };
  return {
    nombres: partes.slice(0, -2).join(' '),
    apellidos: partes.slice(-2).join(' '),
  };
}

function parsearFechaExcel(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null;

  // Número serial nativo de Excel
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const parsed = XLSX.SSF.parse_date_code(valor);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const yy = String(parsed.y).padStart(4, '0');
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    }
    return null;
  }

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const yy = valor.getUTCFullYear();
    const mm = String(valor.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(valor.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  const txt = String(valor).trim();
  if (!txt) return null;

  // Formato ISO: YYYY-MM-DD o YYYY/MM/DD
  const matchIso = txt.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso) {
    const y = Number(matchIso[1]);
    const m = Number(matchIso[2]);
    const d = Number(matchIso[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Formato latino: DD/MM/YYYY o DD-MM-YYYY (o año de 2 dígitos)
  const matchLatam = txt.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (matchLatam) {
    const d = Number(matchLatam[1]);
    const m = Number(matchLatam[2]);
    let y = Number(matchLatam[3]);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
}

function buscarPlanPorTexto(texto: string, planes: Plan[]): Plan | null {
  const q = normalizarClave(texto);
  if (!q) return null;

  // 1. Coincidencia exacta normalizada
  const exacto = planes.find((p) => normalizarClave(p.nombre) === q);
  if (exacto) return exacto;

  // 2. Equivalencias comunes (respetando Diario vs Interdiario y abreviaturas "I" / "M")
  const esInterdiario = /\b(interdiario|i)\b/.test(q);
  const porDuracion = (minD: number, maxD: number): Plan | null =>
    planes.find(
      (p) =>
        p.duracion_dias >= minD &&
        p.duracion_dias <= maxD &&
        normalizarClave(p.nombre).includes('interdiario') === esInterdiario
    ) ??
    planes.find((p) => p.duracion_dias >= minD && p.duracion_dias <= maxD) ??
    null;

  if (q.includes('trimestral') || q.includes('3 meses')) return porDuracion(85, 95);
  if (q.includes('bimestral') || q.includes('2 meses')) return porDuracion(55, 65);
  if (q.includes('semestral') || q.includes('6 meses')) return porDuracion(175, 190);
  if (q.includes('anual') || q.includes('1 ano') || q.includes('12 meses')) return porDuracion(360, 370);
  if (q.includes('mensual') || q.includes('1 mes') || q === 'interdiario') return porDuracion(28, 31);
  if (q.includes('semanal') || q.includes('1 semana')) return porDuracion(6, 8);
  if (
    q === 'diario' ||
    q === 'dia' ||
    q.includes('por dia') ||
    q.includes('pase diario')
  ) {
    return porDuracion(1, 1);
  }

  // 3. Inclusión directa respetando modalidad Diario vs Interdiario
  const incluidos = planes.filter(
    (p) => normalizarClave(p.nombre).includes(q) || q.includes(normalizarClave(p.nombre))
  );
  if (incluidos.length > 0) {
    return (
      incluidos.find(
        (p) => normalizarClave(p.nombre).includes('interdiario') === esInterdiario
      ) ?? incluidos[0]
    );
  }

  return null;
}

function valorColumna(row: Record<string, unknown>, alias: string[]): unknown {
  const mapa = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    mapa.set(normalizarClave(k), v);
  }
  for (const a of alias) {
    if (mapa.has(a)) return mapa.get(a);
  }
  // Búsqueda parcial por si el encabezado incluye extra (ej. "Fecha de inicio (YYYY-MM-DD)")
  for (const [k, v] of mapa.entries()) {
    if (alias.some((a) => k.includes(a))) return v;
  }
  return undefined;
}

export function ImportSociosModal({ gymId, onClose, onDone }: Props) {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargandoPlanes, setCargandoPlanes] = useState(true);
  const [planFallbackId, setPlanFallbackId] = useState<string>('');
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [filasCrudas, setFilasCrudas] = useState<FilaCruda[]>([]);
  const [soloValidas, setSoloValidas] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    listarPlanes(gymId)
      .then((pl) => {
        setPlanes(pl);
        const mensual = pl.find((p) => p.duracion_dias === 30) ?? pl[0];
        if (mensual) setPlanFallbackId(mensual.id);
      })
      .catch((e: Error) => setErrorArchivo(e.message))
      .finally(() => setCargandoPlanes(false));
  }, [gymId]);

  function descargarPlantilla() {
    const hoy = hoyLima();
    const ejemploInicio1 = sumarDias(hoy, -60);
    const ejemploInicio2 = sumarDias(hoy, -20);
    const ejemploFin2 = sumarDias(hoy, 40);

    const plan1 = planes.find((p) => p.duracion_dias >= 85 && p.duracion_dias <= 95) ?? planes[0];
    const plan2 = planes.find((p) => p.duracion_dias >= 55 && p.duracion_dias <= 65) ?? planes[0];

    const filasEjemplo = [
      {
        DNI: '74859612',
        Nombres: 'Mateo',
        Apellidos: 'Alata Quispe',
        Telefono: '987654321',
        Plan: plan1?.nombre ?? '3 meses (Diario)',
        'Fecha Inicio': ejemploInicio1,
        'Fecha Fin': '',
        'Saldo Pendiente': 0,
      },
      {
        DNI: '71234567',
        Nombres: 'Camila Sofía',
        Apellidos: 'Torres Vega',
        Telefono: '912345678',
        Plan: plan2?.nombre ?? '2 meses (Diario)',
        'Fecha Inicio': ejemploInicio2,
        'Fecha Fin': ejemploFin2,
        'Saldo Pendiente': 20,
      },
    ];

    const hojaSocios = XLSX.utils.json_to_sheet(filasEjemplo);
    hojaSocios['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 22 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    const hojaPlanes = XLSX.utils.json_to_sheet(
      planes.map((p) => ({
        'Nombre del Plan': p.nombre,
        'Duración (días)': p.duracion_dias,
        'Precio normal (S/)': p.precio,
      }))
    );
    hojaPlanes['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 18 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaSocios, 'Socios');
    XLSX.utils.book_append_sheet(libro, hojaPlanes, 'Planes Disponibles');
    XLSX.writeFile(libro, 'Plantilla_Importacion_Socios_Zentra.xlsx');
  }

  async function manejarArchivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorArchivo(null);
    setSoloValidas(false);
    setNombreArchivo(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const primeraHoja = workbook.SheetNames[0];
      if (!primeraHoja) {
        setErrorArchivo('El archivo no contiene hojas válidas.');
        setFilasCrudas([]);
        return;
      }

      const sheet = workbook.Sheets[primeraHoja];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: true,
      });

      if (rows.length === 0) {
        setErrorArchivo('La primera hoja del archivo está vacía.');
        setFilasCrudas([]);
        return;
      }

      const parsed: FilaCruda[] = rows.map((r, i) => {
        const dniVal = valorColumna(r, ['dni', 'documento', 'nro documento', 'doc']);
        const nombresVal = valorColumna(r, ['nombres', 'nombre']);
        const apellidosVal = valorColumna(r, ['apellidos', 'apellido']);
        const completoVal = valorColumna(r, ['nombre completo', 'socio', 'cliente', 'alumno']);
        const telVal = valorColumna(r, ['telefono', 'celular', 'whatsapp', 'wsp', 'movil', 'tel']);
        const planVal = valorColumna(r, ['plan', 'membresia', 'paquete', 'servicio']);
        const iniVal = valorColumna(r, [
          'fecha inicio',
          'inicio',
          'fecha inscripcion',
          'inscripcion',
          'desde',
        ]);
        const finVal = valorColumna(r, [
          'fecha fin',
          'fin',
          'fecha vencimiento',
          'vencimiento',
          'vence',
          'hasta',
        ]);
        const saldoVal = valorColumna(r, ['saldo pendiente', 'saldo', 'deuda', 'debe']);

        let nombres = String(nombresVal ?? '').trim();
        let apellidos = String(apellidosVal ?? '').trim();
        if ((!nombres || !apellidos) && completoVal) {
          const sep = separarNombreCompleto(String(completoVal));
          nombres = nombres || sep.nombres;
          apellidos = apellidos || sep.apellidos;
        } else if (nombres && !apellidos && nombres.includes(' ')) {
          const sep = separarNombreCompleto(nombres);
          nombres = sep.nombres;
          apellidos = sep.apellidos;
        }

        const dniDigits = String(dniVal ?? '').replace(/\D/g, '');
        const saldoNum = Number(String(saldoVal ?? '0').replace(/[^\d.-]/g, '')) || 0;

        return {
          filaNum: i + 2,
          dni: dniDigits,
          nombres,
          apellidos,
          telefono: String(telVal ?? '').trim(),
          planTexto: String(planVal ?? '').trim(),
          fechaInicioRaw: iniVal,
          fechaFinRaw: finVal,
          saldo: Math.max(0, Math.round(saldoNum * 100) / 100),
        };
      });

      setFilasCrudas(parsed);
    } catch {
      setErrorArchivo('No se pudo leer el archivo. Asegúrate de subir un Excel (.xlsx) o CSV.');
      setFilasCrudas([]);
    }
  }

  const evaluadas = useMemo<FilaEvaluada[]>(() => {
    const planFallback = planes.find((p) => p.id === planFallbackId) ?? null;
    const dnisVistos = new Set<string>();

    return filasCrudas.map((f) => {
      const planEncontrado = f.planTexto.trim()
        ? buscarPlanPorTexto(f.planTexto, planes)
        : planFallback;

      let ini = parsearFechaExcel(f.fechaInicioRaw);
      let fin = parsearFechaExcel(f.fechaFinRaw);
      if (planEncontrado) {
        if (ini && !fin) {
          fin = sumarDias(ini, planEncontrado.duracion_dias);
        } else if (!ini && fin) {
          ini = sumarDias(fin, -planEncontrado.duracion_dias);
        }
      }

      let error: string | null = null;
      if (!/^\d{7,12}$/.test(f.dni)) {
        error = f.dni.trim()
          ? 'DNI inválido (7 a 12 dígitos)'
          : 'Falta DNI real (pendiente)';
      } else if (dnisVistos.has(f.dni)) {
        error = 'DNI duplicado en el archivo';
      } else {
        dnisVistos.add(f.dni);
        if (!f.nombres || !f.apellidos) {
          error = 'Falta nombres o apellidos';
        } else if (!planEncontrado) {
          error = f.planTexto
            ? `Plan "${f.planTexto}" no reconocido`
            : 'Sin plan y sin plan por defecto';
        } else if (!ini && !fin) {
          error = 'Falta fecha de inicio o fecha de vencimiento';
        } else if (!ini || !fin || fin < ini) {
          error = 'La fecha fin no puede ser menor al inicio';
        }
      }

      return {
        filaNum: f.filaNum,
        dni: f.dni || '—',
        nombres: f.nombres,
        apellidos: f.apellidos,
        telefono: f.telefono || null,
        plan: planEncontrado,
        fechaInicio: ini,
        fechaFin: fin,
        saldoPendiente: f.saldo,
        error,
      };
    });
  }, [filasCrudas, planes, planFallbackId]);

  const validas = useMemo(
    () => evaluadas.filter((r) => r.error === null && r.plan && r.fechaInicio && r.fechaFin),
    [evaluadas]
  );
  const invalidas = evaluadas.length - validas.length;
  const mostrarSoloValidas = soloValidas && validas.length > 0;
  const filasVisibles = mostrarSoloValidas ? validas : evaluadas;

  async function ejecutarImportacion() {
    if (validas.length === 0) return;
    setErrorArchivo(null);
    setImportando(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

      let totalCreados = 0;
      let totalExistentes = 0;
      let totalMembresias = 0;
      let totalOmitidas = 0;

      // Enviar en lotes de 400
      for (let i = 0; i < validas.length; i += 400) {
        const chunk = validas.slice(i, i + 400).map((r) => ({
          dni: r.dni,
          nombres: r.nombres,
          apellidos: r.apellidos,
          telefono: r.telefono,
          planId: r.plan!.id,
          fechaInicio: r.fechaInicio!,
          fechaFin: r.fechaFin!,
          saldoPendiente: r.saldoPendiente,
        }));

        const res = await fetch('/api/socios/migrar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ modo: 'lote', registros: chunk }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Error al importar lote');

        totalCreados += data.sociosCreados ?? 0;
        totalExistentes += data.sociosExistentes ?? 0;
        totalMembresias += data.membresiasCreadas ?? 0;
        totalOmitidas += data.membresiasOmitidas ?? 0;
      }

      const resumen = `Importación lista: ${totalCreados} socios nuevos, ${totalExistentes} existentes actualizados, ${totalMembresias} membresías activadas${
        totalOmitidas > 0 ? ` (${totalOmitidas} duplicadas omitidas)` : ''
      }.`;
      onDone(resumen);
    } catch (e) {
      setErrorArchivo(e instanceof Error ? e.message : 'Error durante la importación');
      setImportando(false);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-titulo"
          className="modal-animate flex max-h-[90vh] w-full max-w-4xl flex-col border border-line bg-surface"
        >
        <header className="flex items-start justify-between border-b border-line/80 p-5">
          <div>
            <h2 id="import-modal-titulo" className="section-title flex items-center gap-2 text-xl">
              <FileSpreadsheet size={20} className="text-brand" />
              Importar socios desde Excel
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Migra socios con planes activos de meses anteriores sin afectar la caja de hoy.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost !min-h-9 !px-2" aria-label="Cerrar">
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Paso 1: Plantilla y Selector */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 border border-line bg-surface-2/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-bone">
                1. Formato de Excel
              </p>
              <p className="text-xs text-muted">
                Tu archivo puede incluir <strong>Fecha Inicio</strong> (ej. hace 2 meses),{' '}
                <strong>Fecha Fin</strong> exacta o solo una de las dos (calculamos la otra según el
                plan). Si ya pagaron, deja <strong>Saldo Pendiente = 0</strong>.
              </p>
              <button
                type="button"
                disabled={cargandoPlanes}
                onClick={descargarPlantilla}
                className="btn btn-secondary !min-h-9 text-xs"
              >
                <Download size={14} strokeWidth={1.5} />
                Descargar plantilla Excel (.xlsx)
              </button>
            </div>

            <div className="space-y-3 border border-line bg-surface-2/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-bone">
                2. Subir archivo (.xlsx / .csv)
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-line bg-surface px-4 py-4 text-center transition-colors hover:border-brand">
                <Upload size={20} className="mb-1.5 text-brand" />
                <span className="text-xs font-medium text-bone">
                  {nombreArchivo ?? 'Haz clic aquí para elegir tu Excel'}
                </span>
                <span className="mt-0.5 text-[11px] text-muted">Soporta .xlsx, .xls y .csv</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={manejarArchivo}
                  className="sr-only"
                />
              </label>

              <div>
                <label htmlFor="fallback-plan" className="label !text-[11px]">
                  Plan por defecto (si alguna fila no coincide por nombre)
                </label>
                <select
                  id="fallback-plan"
                  value={planFallbackId}
                  onChange={(e) => setPlanFallbackId(e.target.value)}
                  className="field !min-h-9 !text-xs"
                >
                  <option value="">-- Exigir coincidencia exacta --</option>
                  {planes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.duracion_dias} días)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {errorArchivo && (
            <p role="alert" className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
              {errorArchivo}
            </p>
          )}

          {/* Vista previa */}
          {evaluadas.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-bone">
                  3. Vista previa ({evaluadas.length} filas leídas)
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-ok">
                    <CheckCircle2 size={14} /> {validas.length} listas para importar
                  </span>
                  {invalidas > 0 && (
                    <span className="inline-flex items-center gap-1 text-warn">
                      <AlertTriangle size={14} /> {invalidas} con observaciones (se omitirán)
                    </span>
                  )}
                  {invalidas > 0 && validas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSoloValidas((v) => !v)}
                      className={`rounded-xs border px-2 py-0.5 text-[11px] font-medium transition ${
                        soloValidas
                          ? 'border-gold bg-gold/15 text-gold'
                          : 'border-line text-muted hover:border-bone/40 hover:text-bone'
                      }`}
                    >
                      {soloValidas ? 'Ver todas' : 'Solo listas'}
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-64 overflow-auto border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-2 text-[11px] uppercase text-muted">
                    <tr>
                      <th
                        className="px-3 py-2"
                        title="Número de fila en tu archivo Excel (la fila 1 son los encabezados)"
                      >
                        Fila
                      </th>
                      <th className="px-3 py-2">DNI</th>
                      <th className="px-3 py-2">Socio</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Vigencia</th>
                      <th className="px-3 py-2">Estado / Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filasVisibles.slice(0, 300).map((r) => {
                      const diasRest = r.fechaFin ? diffDiasISO(r.fechaFin) : null;
                      return (
                        <tr
                          key={r.filaNum}
                          className={r.error ? 'bg-bad/5 text-muted' : 'hover:bg-surface-2/40'}
                        >
                          <td className="px-3 py-2 font-mono text-[11px] text-muted">{r.filaNum}</td>
                          <td className="px-3 py-2 font-mono text-bone">{r.dni}</td>
                          <td className="px-3 py-2">
                            {r.apellidos && r.nombres
                              ? `${r.apellidos}, ${r.nombres}`
                              : r.apellidos || r.nombres || '—'}
                          </td>
                          <td className="px-3 py-2">{r.plan?.nombre ?? '—'}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">
                            {r.fechaInicio && r.fechaFin
                              ? `${formatearFechaDMY(r.fechaInicio)} → ${formatearFechaDMY(r.fechaFin)}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {r.error ? (
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                <span className="text-bad">{r.error}</span>
                                {r.saldoPendiente > 0 && (
                                  <span className="rounded-xs bg-bad/15 px-1.5 py-0.5 text-[10px] font-semibold text-bad">
                                    Debe {soles(r.saldoPendiente)}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                <span
                                  className={
                                    diasRest !== null && diasRest < 0
                                      ? 'text-bad'
                                      : diasRest !== null && diasRest <= 3
                                      ? 'text-warn'
                                      : 'text-ok'
                                  }
                                >
                                  {diasRest !== null
                                    ? diasRest >= 0
                                      ? `Quedan ${diasRest}d`
                                      : `Venció ${Math.abs(diasRest)}d`
                                    : 'OK'}
                                </span>
                                {r.saldoPendiente > 0 && (
                                  <span className="rounded-xs bg-bad/15 px-1.5 py-0.5 text-[10px] font-semibold text-bad">
                                    Debe {soles(r.saldoPendiente)}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filasVisibles.length > 300 && (
                  <p className="border-t border-line bg-surface-2/40 px-3 py-2 text-center text-[11px] text-muted">
                    Mostrando las primeras 300 filas de {filasVisibles.length}. Todas las filas válidas
                    serán importadas.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line/80 p-5">
          <span className="text-xs text-muted">
            Las membresías importadas conservan sus fechas sin ingresar efectivo ficticio a la caja.
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancelar
            </button>
            <button
              type="button"
              disabled={importando || validas.length === 0}
              onClick={ejecutarImportacion}
              className="btn btn-primary !px-6"
            >
              {importando && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
              Importar {validas.length > 0 ? `${validas.length} socios` : ''}
            </button>
          </div>
        </footer>
        </div>
      </div>
    </Portal>
  );
}
