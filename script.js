(() => {
  const TOTAL_CARTAS = 54;
  const CARPETA = "cartas";
  const EXTENSION = "jpg";
  const STORAGE = "loteria_v16_sesion";
  const $ = id => document.getElementById(id);

  const tablaEl = $("tabla");
  const catalogoEl = $("catalogo");
  const estadoEl = $("estado");
  const estadoGuardado = $("estadoGuardado");

  let modo = 4;
  let cartas = Array(16).fill(null);
  let seleccion = null;
  let origenArrastre = null;
  let grupo = [];
  let indiceEdicion = null;
  let sucio = false;
  let guardadoTimer = null;

  function totalCasillas(){ return modo === 4 ? 16 : 25; }
  function ruta(n){ return `${CARPETA}/${n}.${EXTENSION}`; }

  function mezclar(arr){
    const copia = [...arr];
    for(let i = copia.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  function generarTabla(){
    const baraja = mezclar(Array.from({length: TOTAL_CARTAS}, (_, i) => i + 1));
    if(modo === 5) return baraja.slice(0, 25);

    const quince = baraja.slice(0, 15);
    const repetida = quince[Math.floor(Math.random() * quince.length)];
    const resultado = Array(16).fill(null);
    const centros = mezclar([5, 6, 9, 10]).slice(0, 2);

    resultado[centros[0]] = repetida;
    resultado[centros[1]] = repetida;

    const restantes = mezclar(quince.filter(n => n !== repetida));
    let r = 0;
    for(let i = 0; i < resultado.length; i++){
      if(resultado[i] === null) resultado[i] = restantes[r++];
    }
    return resultado;
  }

  function marcarCambio(){
    sucio = true;
    estadoGuardado.textContent = "Guardando...";
    clearTimeout(guardadoTimer);
    guardadoTimer = setTimeout(guardarSesion, 300);
  }

  function guardarSesion(){
    localStorage.setItem(STORAGE, JSON.stringify({
      modo,
      cartas,
      participante: $("participante").value,
      partida: $("partida").value,
      grupo,
      cantidadGrupo: $("cantidadGrupo").value,
      temaClaro: document.body.classList.contains("claro"),
      fecha: Date.now()
    }));
    sucio = false;
    estadoGuardado.textContent = "Todo guardado";
  }

  function cargarSesion(datos){
    modo = datos.modo || 4;
    cartas = Array.isArray(datos.cartas) ? datos.cartas : Array(totalCasillas()).fill(null);
    $("participante").value = datos.participante || "";
    $("partida").value = datos.partida || "1";
    grupo = Array.isArray(datos.grupo) ? datos.grupo : [];
    $("cantidadGrupo").value = datos.cantidadGrupo || "3";
    document.body.classList.toggle("claro", !!datos.temaClaro);
    $("temaToggle").checked = !!datos.temaClaro;
    actualizarModoVisual();
    renderTabla();
    renderGrupo();
  }

  function actualizarModoVisual(){
    $("modo4").classList.toggle("activo", modo === 4);
    $("modo5").classList.toggle("activo", modo === 5);
    tablaEl.className = `tabla tabla-${modo}`;
    $("descripcionModo").textContent = modo === 4
      ? "16 cartas: 15 diferentes y 1 repetida en el centro."
      : "25 cartas diferentes, sin repetidas.";
    $("codigo").placeholder = `Escribe ${totalCasillas()} números`;
  }

  function cambiarModo(nuevoModo){
    if(modo === nuevoModo) return;
    modo = nuevoModo;
    cartas = Array(totalCasillas()).fill(null);
    seleccion = null;
    actualizarModoVisual();
    renderTabla();
    marcarCambio();
  }

  function renderTabla(){
    tablaEl.innerHTML = "";
    tablaEl.className = `tabla tabla-${modo}`;

    cartas.forEach((n, i) => {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "casilla";
      if(i === seleccion) c.classList.add("seleccionada");
      c.draggable = n !== null;

      if(n === null){
        c.innerHTML = `<span class="vacia">Vacía</span>`;
      }else{
        const img = document.createElement("img");
        img.src = ruta(n);
        img.alt = `Carta ${n}`;
        img.draggable = false;
        c.appendChild(img);
      }

      c.addEventListener("click", () => {
        seleccion = i;
        $("numeroCarta").value = n ?? "";
        renderTabla();
        estadoEl.textContent = n ? `Carta seleccionada: ${n}` : `Casilla ${i + 1} seleccionada`;
      });

      c.addEventListener("dragstart", e => {
        origenArrastre = i;
        e.dataTransfer.setData("text/plain", String(i));
      });

      c.addEventListener("dragover", e => e.preventDefault());

      c.addEventListener("drop", e => {
        e.preventDefault();
        const origen = origenArrastre ?? Number(e.dataTransfer.getData("text/plain"));
        if(!Number.isInteger(origen) || origen === i) return;
        [cartas[origen], cartas[i]] = [cartas[i], cartas[origen]];
        seleccion = i;
        renderTabla();
        marcarCambio();
      });

      tablaEl.appendChild(c);
    });

    $("codigo").value = cartas.map(n => n ?? "").join(", ");
  }

  function renderCatalogo(){
    catalogoEl.innerHTML = "";
    for(let n = 1; n <= TOTAL_CARTAS; n++){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "catalogo-carta";

      const img = document.createElement("img");
      img.src = ruta(n);
      img.alt = `Carta ${n}`;

      const num = document.createElement("span");
      num.textContent = n;

      b.append(img, num);
      b.addEventListener("click", () => reemplazarCon(n));
      catalogoEl.appendChild(b);
    }
  }

  function reemplazarCon(n){
    if(seleccion === null){
      estadoEl.textContent = "Primero selecciona una carta de la tabla.";
      return;
    }
    cartas[seleccion] = n;
    renderTabla();
    estadoEl.textContent = `Carta reemplazada por la número ${n}.`;
    marcarCambio();
  }

  function leerCodigo(){
    const valores = $("codigo").value.trim().split(/[\s,;|/-]+/).filter(Boolean).map(Number);
    if(valores.length !== totalCasillas()) throw new Error(`Debes escribir exactamente ${totalCasillas()} números.`);
    if(valores.some(n => !Number.isInteger(n) || n < 1 || n > 54)) throw new Error("Todos los números deben estar entre 1 y 54.");
    if(modo === 5 && new Set(valores).size !== 25) throw new Error("En 5×5 las 25 cartas deben ser diferentes.");
    return valores;
  }

  function cargarImagen(src){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function canvasTabla(datos, titulo, columnas, escala = 1){
    const filas = Math.ceil(datos.length / columnas);
    const cw = 190 * escala;
    const ch = 280 * escala;
    const gap = 8 * escala;
    const margen = 20 * escala;
    const encabezado = 54 * escala;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(margen * 2 + cw * columnas + gap * (columnas - 1));
    canvas.height = Math.round(margen * 2 + encabezado + ch * filas + gap * (filas - 1));

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f5efe5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#222";
    ctx.font = `bold ${24 * escala}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(titulo, canvas.width / 2, 35 * escala);

    const imgs = await Promise.all(datos.map(async n => {
      try { return await cargarImagen(ruta(n)); }
      catch { return null; }
    }));

    datos.forEach((n, i) => {
      const col = i % columnas;
      const fila = Math.floor(i / columnas);
      const x = margen + col * (cw + gap);
      const y = margen + encabezado + fila * (ch + gap);

      ctx.fillStyle = "#fff";
      ctx.fillRect(x, y, cw, ch);

      const img = imgs[i];
      if(img){
        const scale = Math.min(cw / img.width, ch / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, x + (cw - dw) / 2, y + (ch - dh) / 2, dw, dh);
      }

      ctx.strokeStyle = "#cfc7cf";
      ctx.lineWidth = Math.max(1, escala);
      ctx.strokeRect(x, y, cw, ch);
    });

    return canvas;
  }

  function descargarPng(canvas, nombre){
    const a = document.createElement("a");
    a.download = `${nombre}.png`;
    a.href = canvas.toDataURL("image/png");
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function descargarPdfCartaDesdeCanvas(canvas, nombre){
    if(!window.jspdf?.jsPDF) throw new Error("No se pudo cargar el generador de PDF.");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({orientation:"portrait", unit:"mm", format:"letter"});
    const pageW = 215.9;
    const pageH = 279.4;
    const margen = 6;
    const scale = Math.min((pageW - margen*2) / canvas.width, (pageH - margen*2) / canvas.height);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW-w)/2, (pageH-h)/2, w, h, undefined, "FAST");
    pdf.save(`${nombre}.pdf`);
  }

  async function exportarActual(tipo){
    if(cartas.some(n => n === null)){
      estadoEl.textContent = "Completa la tabla antes de descargar.";
      return;
    }
    try{
      estadoEl.textContent = "Preparando archivo...";
      const titulo = `${$("participante").value || "Participante"} - Partida ${$("partida").value || 1}`;
      const canvas = await canvasTabla(cartas, titulo, modo, 2);
      if(tipo === "png") descargarPng(canvas, "tabla_loteria");
      else descargarPdfCartaDesdeCanvas(canvas, "tabla_loteria");
      estadoEl.textContent = `Archivo ${tipo.toUpperCase()} descargado.`;
    }catch(e){
      estadoEl.textContent = e.message;
    }
  }

  function renderGrupo(){
    const vista = $("vistaGrupo");
    vista.innerHTML = "";
    const limite = Number($("cantidadGrupo").value);

    if(grupo.length > limite) grupo = grupo.slice(0, limite);

    if(!grupo.length){
      vista.className = "vista-grupo vacio";
      vista.textContent = "Todavía no hay tablas agregadas.";
    }else{
      vista.className = "vista-grupo";
      grupo.forEach((item, i) => {
        const card = document.createElement("article");
        card.className = "mini-grupo";
        if(i === indiceEdicion) card.classList.add("editando");

        const head = document.createElement("div");
        head.className = "mini-head";
        head.innerHTML = `<div><b>Tabla ${i+1}</b><small>${item.modo}×${item.modo} · ${item.participante}</small></div>`;

        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.className = "mini-btn";
        editar.onclick = () => {
          modo = item.modo;
          cartas = [...item.cartas];
          $("participante").value = item.participante;
          $("partida").value = item.partida;
          indiceEdicion = i;
          $("agregarGrupo").classList.add("oculto");
          $("actualizarGrupo").classList.remove("oculto");
          $("cancelarEdicion").classList.remove("oculto");
          actualizarModoVisual();
          renderTabla();
          renderGrupo();
          window.scrollTo({top:0, behavior:"smooth"});
        };

        const eliminar = document.createElement("button");
        eliminar.textContent = "Eliminar";
        eliminar.className = "mini-btn eliminar";
        eliminar.onclick = () => {
          grupo.splice(i, 1);
          renderGrupo();
          marcarCambio();
        };

        head.append(editar, eliminar);

        const mini = document.createElement("div");
        mini.className = `mini-tabla mini-${item.modo}`;
        item.cartas.forEach(n => {
          const c = document.createElement("div");
          const img = document.createElement("img");
          img.src = ruta(n);
          c.appendChild(img);
          mini.appendChild(c);
        });

        card.append(head, mini);
        vista.appendChild(card);
      });
    }

    const faltan = limite - grupo.length;
    $("textoProgreso").textContent = `${grupo.length} de ${limite} tablas`;
    $("barraProgreso").style.width = `${Math.min(100, grupo.length / limite * 100)}%`;
    $("grupoPng").disabled = faltan !== 0;
    $("grupoPdf").disabled = faltan !== 0;
    $("agregarGrupo").disabled = grupo.length >= limite && indiceEdicion === null;
  }

  function cancelarEdicionGrupo(){
    indiceEdicion = null;
    $("agregarGrupo").classList.remove("oculto");
    $("actualizarGrupo").classList.add("oculto");
    $("cancelarEdicion").classList.add("oculto");
  }

  async function crearHojaGrupo(){
    const limite = Number($("cantidadGrupo").value);
    if(grupo.length !== limite) throw new Error(`Completa las ${limite} tablas.`);

    const pageW = 2550;
    const pageH = 3300;
    const margen = 90;
    let cols, rows;

    if(limite === 3){ cols = 1; rows = 3; }
    else if(limite === 6){ cols = 2; rows = 3; }
    else { cols = 3; rows = 3; }

    const gap = 30;
    const slotW = (pageW - margen*2 - gap*(cols-1)) / cols;
    const slotH = (pageH - margen*2 - gap*(rows-1)) / rows;

    const canvas = document.createElement("canvas");
    canvas.width = pageW;
    canvas.height = pageH;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,pageW,pageH);

    for(let i = 0; i < grupo.length; i++){
      const item = grupo[i];
      const tCanvas = await canvasTabla(item.cartas, `Tabla ${i+1} - ${item.participante}`, item.modo, 1.4);

      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margen + col*(slotW+gap);
      const y = margen + row*(slotH+gap);
      const scale = Math.min(slotW/tCanvas.width, slotH/tCanvas.height);
      const w = tCanvas.width*scale;
      const h = tCanvas.height*scale;
      ctx.drawImage(tCanvas, x+(slotW-w)/2, y+(slotH-h)/2, w, h);
    }

    return canvas;
  }

  $("modo4").onclick = () => cambiarModo(4);
  $("modo5").onclick = () => cambiarModo(5);

  $("generar").onclick = () => {
    cartas = generarTabla();
    seleccion = null;
    renderTabla();
    estadoEl.textContent = modo === 4
      ? "Tabla 4×4 generada con una carta repetida en el centro."
      : "Tabla 5×5 generada sin cartas repetidas.";
    marcarCambio();
  };

  $("limpiar").onclick = () => {
    cartas = Array(totalCasillas()).fill(null);
    seleccion = null;
    renderTabla();
    marcarCambio();
  };

  $("insertar").onclick = () => {
    try{
      cartas = leerCodigo();
      seleccion = null;
      renderTabla();
      estadoEl.textContent = "Código insertado correctamente.";
      marcarCambio();
    }catch(e){
      estadoEl.textContent = e.message;
    }
  };

  $("reemplazar").onclick = () => {
    const n = Number($("numeroCarta").value);
    if(!Number.isInteger(n) || n < 1 || n > 54){
      estadoEl.textContent = "Escribe un número del 1 al 54.";
      return;
    }
    reemplazarCon(n);
  };

  $("descargarPng").onclick = () => exportarActual("png");
  $("descargarPdf").onclick = () => exportarActual("pdf");

  $("agregarGrupo").onclick = () => {
    if(cartas.some(n => n === null)){
      estadoEl.textContent = "Completa la tabla actual antes de agregarla.";
      return;
    }
    const limite = Number($("cantidadGrupo").value);
    if(grupo.length >= limite) return;

    grupo.push({
      modo,
      cartas:[...cartas],
      participante:$("participante").value || `Participante ${grupo.length+1}`,
      partida:$("partida").value || "1"
    });
    renderGrupo();
    marcarCambio();
  };

  $("actualizarGrupo").onclick = () => {
    if(indiceEdicion === null) return;
    grupo[indiceEdicion] = {
      modo,
      cartas:[...cartas],
      participante:$("participante").value || `Participante ${indiceEdicion+1}`,
      partida:$("partida").value || "1"
    };
    cancelarEdicionGrupo();
    renderGrupo();
    marcarCambio();
  };

  $("cancelarEdicion").onclick = () => {
    cancelarEdicionGrupo();
    renderGrupo();
  };

  $("limpiarGrupo").onclick = () => {
    grupo = [];
    cancelarEdicionGrupo();
    renderGrupo();
    marcarCambio();
  };

  $("cantidadGrupo").onchange = () => {
    renderGrupo();
    marcarCambio();
  };

  $("grupoPng").onclick = async () => {
    try{
      estadoEl.textContent = "Preparando hoja PNG...";
      const canvas = await crearHojaGrupo();
      descargarPng(canvas, `grupo_${grupo.length}_tablas`);
      estadoEl.textContent = "Grupo descargado en una hoja PNG.";
    }catch(e){
      estadoEl.textContent = e.message;
    }
  };

  $("grupoPdf").onclick = async () => {
    try{
      estadoEl.textContent = "Preparando hoja PDF...";
      const canvas = await crearHojaGrupo();
      descargarPdfCartaDesdeCanvas(canvas, `grupo_${grupo.length}_tablas`);
      estadoEl.textContent = "Grupo descargado en una hoja PDF tamaño Carta.";
    }catch(e){
      estadoEl.textContent = e.message;
    }
  };

  $("temaToggle").onchange = () => {
    document.body.classList.toggle("claro", $("temaToggle").checked);
    marcarCambio();
  };

  $("participante").oninput = marcarCambio;
  $("partida").oninput = marcarCambio;

  window.addEventListener("beforeunload", e => {
    if(!sucio) return;
    e.preventDefault();
    e.returnValue = "";
  });

  $("continuarSesion").onclick = () => {
    const datos = JSON.parse(localStorage.getItem(STORAGE));
    cargarSesion(datos);
    $("modalRecuperar").classList.add("oculto");
  };

  $("nuevaSesion").onclick = () => {
    localStorage.removeItem(STORAGE);
    $("modalRecuperar").classList.add("oculto");
    modo = 4;
    cartas = Array(16).fill(null);
    grupo = [];
    actualizarModoVisual();
    renderTabla();
    renderGrupo();
    guardarSesion();
  };

  renderCatalogo();
  actualizarModoVisual();
  renderTabla();
  renderGrupo();

  const sesion = localStorage.getItem(STORAGE);
  if(sesion) $("modalRecuperar").classList.remove("oculto");
  else guardarSesion();
})();