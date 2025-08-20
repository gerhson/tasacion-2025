// Configuración actualizada 2024
const FX_PEN_USD = 3.75; // Tipo de cambio actualizado S/ a USD (agosto 2024)

// Factores de tasación basados en estándares peruanos actuales
const FACTORES_TASACION = {
  antiguedad: {
    // Factor de depreciación por año (más realista según mercado peruano)
    depreciacionAnual: 0.008, // 0.8% anual
    depreciacionMaxima: 0.35, // Máximo 35% de depreciación
    // Inmuebles muy nuevos pueden tener premium
    premiumNuevo: 0.05 // +5% si tiene menos de 2 años
  },
  
  dormitorios: {
    // Factores basados en demanda del mercado peruano
    base: 2, // Número base de dormitorios
    incrementoPorDormitorio: 0.08, // +8% por dormitorio adicional
    decrementoPorDefecto: 0.12, // -12% si tiene menos dormitorios
    maximoIncremento: 0.25 // Máximo 25% de incremento
  },
  
  banos: {
    base: 2,
    incrementoPorBano: 0.06, // +6% por baño adicional  
    decrementoPorDefecto: 0.15, // -15% si tiene menos baños
    maximoIncremento: 0.18 // Máximo 18% de incremento
  },
  
  piso: {
    // Factores de piso según estudios de mercado
    pisosBajos: { min: 1, max: 2, factor: 0.92 }, // -8% pisos 1-2
    pisosIdeales: { min: 3, max: 8, factor: 1.0 }, // Base pisos 3-8
    pisosAltos: { min: 9, max: 15, factor: 0.96 }, // -4% pisos 9-15
    pisosExtremosAltos: { min: 16, max: 999, factor: 0.88 } // -12% piso 16+
  },
  
  ascensor: {
    // Impacto del ascensor según altura
    sinAscensor: {
      piso1_3: 1.0,    // Sin penalización pisos 1-3
      piso4_6: 0.90,   // -10% pisos 4-6
      piso7Plus: 0.75  // -25% piso 7+
    },
    conAscensor: {
      premium: 0.08,   // +8% por tener ascensor
      pisoAlto: 0.03   // +3% adicional para pisos 6+
    }
  },
  
  areaLibre: {
    // Ponderación del área libre según tipo
    departamento: 0.25, // 25% para departamentos
    casa: 0.40,         // 40% para casas
    terreno: 0.90       // 90% para terrenos
  },
  
  tipoInmueble: {
    departamento: 1.0,   // Base
    casa: 1.12,          // +12% casas tienen más demanda
    terreno: 0.80,       // -20% terrenos requieren construcción
    oficina: 0.95,       // -5% oficinas (menor demanda residencial)
    local: 0.85          // -15% locales comerciales
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const distritoSel = document.getElementById("distrito");
  const zonaSel = document.getElementById("zona");
  const form = document.getElementById("calc");

  // Validar que existe DATA
  if (typeof DATA === 'undefined') {
    console.error('ERROR: Variable DATA no está definida');
    return;
  }

  // Cargar distritos con manejo de errores
  try {
    const distritos = Object.keys(DATA);
    if (distritos.length === 0) {
      throw new Error('No hay distritos disponibles');
    }
    
    // Agregar opción por defecto
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Seleccione distrito...";
    distritoSel.appendChild(defaultOpt);
    
    distritos.forEach(distrito => {
      const opt = document.createElement("option");
      opt.value = distrito;
      opt.textContent = distrito;
      distritoSel.appendChild(opt);
    });
  } catch (error) {
    console.error('Error cargando distritos:', error);
    mostrarError('Error al cargar los distritos disponibles');
  }

  // Evento cambio de distrito
  distritoSel.addEventListener("change", () => {
    cargarZonas();
  });

  function cargarZonas() {
    // Limpiar zonas
    zonaSel.innerHTML = "";
    
    if (!distritoSel.value) {
      return;
    }

    try {
      const zonas = DATA[distritoSel.value]?.zones; // Cambio: usar 'zones' en lugar de 'zonas'
      if (!zonas) {
        throw new Error('No se encontraron zonas para el distrito seleccionado');
      }

      // Agregar opción por defecto
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Seleccione zona...";
      zonaSel.appendChild(defaultOpt);

      Object.keys(zonas).forEach(zona => {
        const opt = document.createElement("option");
        opt.value = zona;
        opt.textContent = zona;
        zonaSel.appendChild(opt);
      });
    } catch (error) {
      console.error('Error cargando zonas:', error);
      mostrarError('Error al cargar las zonas del distrito seleccionado');
    }
  }

  // Evento submit del formulario
  form.addEventListener("submit", e => {
    e.preventDefault();
    calcular();
  });

  function mostrarError(mensaje) {
    // Mostrar error en el summary
    const summary = document.getElementById("summary");
    if (summary) {
      summary.textContent = `Error: ${mensaje}`;
      summary.style.color = '#ef4444';
    }
  }

  function limpiarResultados() {
    const elementos = ['valMin', 'valMed', 'valMax'];
    elementos.forEach(id => {
      const elemento = document.getElementById(id);
      if (elemento) {
        elemento.textContent = '-';
      }
    });
  }

  function validarInputs(datos) {
    const errores = [];
    
    if (!datos.distrito || !datos.zona) {
      errores.push('Debe seleccionar distrito y zona');
    }
    
    if (!datos.tipo) {
      errores.push('Debe seleccionar el tipo de inmueble');
    }
    
    if (datos.areaT <= 0) {
      errores.push('El área techada debe ser mayor a 0');
    }
    
    if (datos.areaL < 0) {
      errores.push('El área libre no puede ser negativa');
    }
    
    if (datos.dorms < 1) {
      errores.push('Debe tener al menos 1 dormitorio');
    }
    
    if (datos.baths < 1) {
      errores.push('Debe tener al menos 1 baño');
    }
    
    if (datos.piso < 1) {
      errores.push('El piso debe ser 1 o mayor');
    }
    
    if (datos.antig < 0) {
      errores.push('La antigüedad no puede ser negativa');
    }
    
    return errores;
  }

  function aplicarFactorAntiguedad(valor, antiguedad) {
    if (antiguedad <= 1) {
      // Inmuebles muy nuevos tienen premium
      return valor * (1 + FACTORES_TASACION.antiguedad.premiumNuevo);
    }
    
    const depreciacion = Math.min(
      antiguedad * FACTORES_TASACION.antiguedad.depreciacionAnual,
      FACTORES_TASACION.antiguedad.depreciacionMaxima
    );
    
    return valor * (1 - depreciacion);
  }

  function aplicarFactorDormitorios(valor, dormitorios) {
    const { base, incrementoPorDormitorio, decrementoPorDefecto, maximoIncremento } = FACTORES_TASACION.dormitorios;
    
    if (dormitorios === base) {
      return valor; // Sin cambio
    }
    
    if (dormitorios > base) {
      const incremento = Math.min(
        (dormitorios - base) * incrementoPorDormitorio,
        maximoIncremento
      );
      return valor * (1 + incremento);
    } else {
      // Penalización por tener menos dormitorios
      const decremento = (base - dormitorios) * decrementoPorDefecto;
      return valor * (1 - decremento);
    }
  }

  function aplicarFactorBanos(valor, banos) {
    const { base, incrementoPorBano, decrementoPorDefecto, maximoIncremento } = FACTORES_TASACION.banos;
    
    if (banos === base) {
      return valor;
    }
    
    if (banos > base) {
      const incremento = Math.min(
        (banos - base) * incrementoPorBano,
        maximoIncremento
      );
      return valor * (1 + incremento);
    } else {
      const decremento = (base - banos) * decrementoPorDefecto;
      return valor * (1 - decremento);
    }
  }

  function aplicarFactorPiso(valor, piso, tieneAscensor) {
    let factorPiso = 1.0;
    
    // Factor base por piso
    const { pisosBajos, pisosIdeales, pisosAltos, pisosExtremosAltos } = FACTORES_TASACION.piso;
    
    if (piso >= pisosBajos.min && piso <= pisosBajos.max) {
      factorPiso = pisosBajos.factor;
    } else if (piso >= pisosIdeales.min && piso <= pisosIdeales.max) {
      factorPiso = pisosIdeales.factor;
    } else if (piso >= pisosAltos.min && piso <= pisosAltos.max) {
      factorPiso = pisosAltos.factor;
    } else if (piso >= pisosExtremosAltos.min) {
      factorPiso = pisosExtremosAltos.factor;
    }
    
    // Factor por ascensor
    let factorAscensor = 1.0;
    
    if (tieneAscensor) {
      factorAscensor *= (1 + FACTORES_TASACION.ascensor.conAscensor.premium);
      if (piso >= 6) {
        factorAscensor *= (1 + FACTORES_TASACION.ascensor.conAscensor.pisoAlto);
      }
    } else {
      // Penalización por no tener ascensor según piso
      if (piso >= 7) {
        factorAscensor = FACTORES_TASACION.ascensor.sinAscensor.piso7Plus;
      } else if (piso >= 4) {
        factorAscensor = FACTORES_TASACION.ascensor.sinAscensor.piso4_6;
      }
    }
    
    return valor * factorPiso * factorAscensor;
  }

  function calcular() {
    try {
      // Limpiar resultados previos
      limpiarResultados();
      
      // Obtener datos del formulario
      const datos = {
        distrito: distritoSel.value,
        zona: zonaSel.value,
        tipo: document.getElementById("tipo").value,
        areaT: parseFloat(document.getElementById("areaTechada").value) || 0,
        areaL: parseFloat(document.getElementById("areaLibre").value) || 0,
        dorms: parseInt(document.getElementById("dorms").value) || 0,
        baths: parseInt(document.getElementById("baths").value) || 0,
        piso: parseInt(document.getElementById("piso").value) || 0,
        ascensor: document.getElementById("ascensor").value,
        antig: parseInt(document.getElementById("antiguedad").value) || 0,
        curr: document.getElementById("currency").value
      };

      // Validar inputs
      const errores = validarInputs(datos);
      if (errores.length > 0) {
        mostrarError(errores.join('. '));
        return;
      }

      // Obtener precio base por m² según zona
      const precioM2 = DATA[datos.distrito]?.zones?.[datos.zona]; // Cambio: usar 'zones'
      if (!precioM2) {
        throw new Error('No se encontró precio para la zona seleccionada');
      }

      // Calcular área ponderada según tipo de inmueble
      let factorAreaLibre;
      if (datos.tipo.toLowerCase().includes('departamento')) {
        factorAreaLibre = FACTORES_TASACION.areaLibre.departamento;
      } else if (datos.tipo.toLowerCase().includes('casa')) {
        factorAreaLibre = FACTORES_TASACION.areaLibre.casa;
      } else if (datos.tipo.toLowerCase().includes('terreno')) {
        factorAreaLibre = FACTORES_TASACION.areaLibre.terreno;
      } else {
        factorAreaLibre = FACTORES_TASACION.areaLibre.departamento; // Por defecto
      }

      const areaPonderada = datos.areaT + (datos.areaL * factorAreaLibre);
      let valorBase = precioM2 * areaPonderada;

      // Aplicar factores de tasación
      valorBase = aplicarFactorAntiguedad(valorBase, datos.antig);
      valorBase = aplicarFactorDormitorios(valorBase, datos.dorms);
      valorBase = aplicarFactorBanos(valorBase, datos.baths);
      valorBase = aplicarFactorPiso(valorBase, datos.piso, datos.ascensor === "con");

      // Factor por tipo de inmueble
      const tipoKey = datos.tipo.toLowerCase().includes('departamento') ? 'departamento' :
                     datos.tipo.toLowerCase().includes('casa') ? 'casa' :
                     datos.tipo.toLowerCase().includes('terreno') ? 'terreno' :
                     datos.tipo.toLowerCase().includes('oficina') ? 'oficina' :
                     datos.tipo.toLowerCase().includes('local') ? 'local' : 'departamento';
      
      valorBase *= FACTORES_TASACION.tipoInmueble[tipoKey] || 1.0;

      // Rango de estimación (±12% es más realista)
      const rangoVariacion = 0.12;
      const valMin = valorBase * (1 - rangoVariacion);
      const valMax = valorBase * (1 + rangoVariacion);

      // Conversión de moneda
      const divisa = datos.curr === "USD" ? "USD" : "S/";
      const factorConversion = datos.curr === "USD" ? (1 / FX_PEN_USD) : 1;

      // Formatear números con separadores de miles
      const formatearMoneda = (valor) => {
        return new Intl.NumberFormat('es-PE', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(valor);
      };

      // Actualizar resultados en el DOM
      document.getElementById("summary").textContent = 
        `Estimación para ${datos.tipo} en ${datos.zona}, ${datos.distrito}`;
      document.getElementById("summary").style.color = '#333'; // Resetear color de error
      
      document.getElementById("valMin").textContent = 
        `${formatearMoneda(valMin * factorConversion)} ${divisa}`;
      document.getElementById("valMed").textContent = 
        `${formatearMoneda(valorBase * factorConversion)} ${divisa}`;
      document.getElementById("valMax").textContent = 
        `${formatearMoneda(valMax * factorConversion)} ${divisa}`;

    } catch (error) {
      console.error('Error en cálculo:', error);
      mostrarError(error.message || 'Error en el cálculo de tasación');
    }
  }
});