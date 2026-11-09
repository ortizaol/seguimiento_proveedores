# Seguimiento a proveedores — Guía del ANALISTA

Usted es la única persona que alimenta la herramienta. Dos veces por semana.

## Qué hacer (2 veces por semana)

1. Exporte de Siesa, **sin cambiarles nada**:
   - Listado de OC abiertas → `OC_ddmmaaaa.txt` (ej. `OC_31102026.txt`)
   - Explosión de abastecimiento → `ABASTECIMIENTO_ddmmaaaa.xlsx` (ej. `ABASTECIMIENTO_31102026.xlsx`)
2. Cópielos en la carpeta **`CARPETA_RAIZ\entrada\`**.
3. Listo. La herramienta usa sola el archivo de **fecha más reciente** (según el nombre).

Reglas del nombre: la fecha es la del día de exportación, en formato `ddmmaaaa` (día, mes, año, sin separadores). No borre los archivos anteriores: si el nuevo sale dañado, la herramienta usa el anterior.

```
CARPETA_RAIZ\
  entrada\        ← AQUÍ deja usted los dos archivos
  config\         (no tocar: lo mantiene el jefe de compras)
  registro\       (no tocar: lo escribe la herramienta)
```

## Si un comprador le dice que salió el aviso AMARILLO

> *"Se está usando la explosión del dd/mm porque la nueva está dañada"*
> (o *"el listado de OC del dd/mm porque el nuevo está dañado"*)

Significa que el último archivo que dejó no se pudo leer (copia incompleta, archivo abierto mientras se copiaba, columnas cambiadas). La herramienta sigue funcionando con el archivo anterior.

1. Vuelva a exportar el archivo desde Siesa.
2. Ábralo una vez en Excel para confirmar que abre bien; ciérrelo.
3. Cópielo en `entrada\` **con un nombre nuevo** o reemplazando el dañado (mismo nombre).
4. Pida al comprador que recargue la página (F5). El aviso desaparece.

El aviso queda registrado en `registro\fechas_prometidas.xlsx`, hoja `historial`.

## Si sale el aviso ROJO "Avise al analista: falta la explosión / el listado de OC"

No hay ningún archivo válido de ese tipo en `entrada\`. Revise que el nombre empiece exactamente por `OC_` o `ABASTECIMIENTO_` seguido de la fecha `ddmmaaaa`, y que la extensión sea `.txt` / `.xlsx`.

## Lo que la herramienta espera de cada archivo

- **OC (.txt):** texto separado por tabuladores tal como sale de Siesa. Columnas usadas: `Nro orden`, `Razón social proveedor`, `Item`, `Desc. item`, `U.M.`, `Cant. pendiente`, `Nro solicitud`.
- **Explosión (.xlsx):** hoja `Explosión` con las columnas `Item`, `Fecha Planeación`, `Cant Penditiente - Inventario`, `ITEMS GESTION.GESTIÓN`, `Excluido`.

Si Siesa cambia el nombre de alguna de esas columnas, el archivo se tomará como dañado: avise al jefe de compras.

La primera vez que se abre una explosión nueva la carga tarda unos segundos (hasta ~30 s en un PC lento). Después la herramienta guarda una copia liviana en `registro\cache\` y abre en 1–2 segundos.
