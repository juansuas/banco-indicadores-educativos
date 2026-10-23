# Banco de Indicadores Educativos

Aplicación web para consultar fichas metodológicas de indicadores educativos basados en sistemas nominales.

La interfaz permite buscar, filtrar, consultar y comparar 112 indicadores organizados en cinco grupos temáticos. El sitio utiliza archivos estáticos y carga el catálogo público desde `data/indicadores.json`.

## Publicación

Sitio preparado para GitHub Pages:

<https://juanchoas.github.io/banco-indicadores-educativos/>

## Desarrollo local

Desde esta carpeta puede iniciarse un servidor estático con:

```powershell
python -m http.server 8000
```

Luego, abrir <http://localhost:8000/>.

## Créditos

Desarrollo realizado con el apoyo de la Organización de Estados Iberoamericanos (OEI).

El catálogo publicado contiene metadatos metodológicos y no incluye datos personales ni resultados nominales.
