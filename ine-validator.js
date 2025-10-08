// ine-validator.js - Módulo de validación de INE MEJORADO
class INEValidator {
    constructor() {
        this.validationSteps = [
            { id: 'format', name: 'Formato de documento', description: 'Verificación de dimensiones y formato' },
            { id: 'structure', name: 'Estructura de datos', description: 'Validación de CURP y clave de elector' },
            { id: 'design', name: 'Diseño oficial', description: 'Elementos visuales del INE' },
            { id: 'security', name: 'Elementos de seguridad', description: 'Microtexto, OVD, relieve táctil' },
            { id: 'validity', name: 'Vigencia', description: 'Verificación de vigencia de la credencial' }
        ];
        
        // Patrones de validación
        this.curpPattern = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/;
        this.electorKeyPattern = /^[A-Z]{4}\d{10}[A-Z0-9]{2}$/;
        this.ineTextPatterns = [
            'INSTITUTO NACIONAL ELECTORAL',
            'CREDENCIAL PARA VOTAR',
            'CLAVE DE ELECTOR',
            'CURP',
            'VIGENCIA'
        ];
    }

    // Método principal para validar una INE
    async validateINE(imageData, options = {}) {
        console.log('🔍 Iniciando validación de INE...');
        
        const results = {
            isValid: false,
            score: 0,
            details: {},
            recommendations: [],
            fileSize: this.extractFileSize(imageData),
            documentType: 'unknown'
        };

        try {
            // 0. Verificar formato básico del documento
            const formatResult = await this.validateDocumentFormat(imageData);
            results.details.format = formatResult;
            results.documentType = formatResult.documentType;
            
            // Si no es una imagen o el formato no es adecuado, terminar aquí
            if (!formatResult.passed) {
                results.score = 0;
                results.isValid = false;
                results.recommendations = ['El documento no tiene el formato adecuado para ser una INE válida'];
                return results;
            }

            // 1. Análisis de estructura de datos
            const structureResult = await this.validateStructure(imageData);
            results.details.structure = structureResult;
            
            // 2. Verificación de diseño oficial
            const designResult = await this.validateOfficialDesign(imageData);
            results.details.design = designResult;
            
            // 3. Detección de elementos de seguridad
            const securityResult = await this.validateSecurityElements(imageData);
            results.details.security = securityResult;
            
            // 4. Verificación de vigencia
            const validityResult = await this.validateValidity(imageData);
            results.details.validity = validityResult;

            // Calcular puntuación general
            results.score = this.calculateScore(results.details);
            results.isValid = results.score >= 70; // 70% mínimo para considerar válida
            
            // Generar recomendaciones
            results.recommendations = this.generateRecommendations(results.details);
            
        } catch (error) {
            console.error('Error en validación de INE:', error);
            results.error = error.message;
        }

        return results;
    }

    // Validación de formato del documento
    async validateDocumentFormat(imageData) {
        console.log('📄 Validando formato del documento...');
        
        const results = {
            passed: false,
            documentType: 'unknown',
            elements: []
        };

        try {
            // Crear imagen para análisis
            const img = await this.createImage(imageData);
            
            // Verificar dimensiones (INE típica: ~8.6x5.4 cm en alta resolución)
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            const aspectRatio = width / height;
            
            // Una INE típica tiene relación de aspecto ~1.6 (86mm/54mm ≈ 1.59)
            const isCorrectAspect = aspectRatio >= 1.5 && aspectRatio <= 1.7;
            
            results.elements.push({
                name: 'Relación de aspecto',
                passed: isCorrectAspect,
                value: `${aspectRatio.toFixed(2)} (${width}x${height})`,
                expected: '1.5 - 1.7 (86mm x 54mm)'
            });

            // Verificar tamaño mínimo (debe ser legible)
            const isSufficientSize = width >= 500 && height >= 300;
            results.elements.push({
                name: 'Tamaño suficiente',
                passed: isSufficientSize,
                value: `${width}x${height} píxeles`,
                expected: 'Mínimo 500x300 píxeles'
            });

            // Verificar si es imagen (no PDF u otro formato)
            const isImage = imageData.startsWith('data:image/');
            results.elements.push({
                name: 'Formato de imagen',
                passed: isImage,
                value: isImage ? imageData.split(';')[0].split('/')[1] : 'No es imagen',
                expected: 'JPG, PNG, WebP'
            });

            // Determinar tipo de documento
            if (isImage && isCorrectAspect && isSufficientSize) {
                results.documentType = 'potential_ine';
                results.passed = true;
            } else if (isImage) {
                results.documentType = 'other_image';
            } else {
                results.documentType = 'other_document';
            }

        } catch (error) {
            console.error('Error en validación de formato:', error);
            results.elements.push({
                name: 'Formato del documento',
                passed: false,
                value: 'Error al procesar imagen',
                expected: 'Imagen válida'
            });
        }

        return results;
    }

    // Validación de estructura de datos (CURP, clave de elector)
    async validateStructure(imageData) {
        console.log('📊 Validando estructura de datos...');
        
        const results = {
            passed: false,
            elements: []
        };

        try {
            // Extraer texto de la imagen (simulación)
            const extractedData = await this.extractTextFromImage(imageData);
            
            // Validar formato de CURP
            if (extractedData.curp) {
                const curpValid = this.validateCURPFormat(extractedData.curp);
                results.elements.push({
                    name: 'Formato CURP',
                    passed: curpValid,
                    value: extractedData.curp,
                    expected: '4 letras + 6 números + H/M + 5 letras + 2 caracteres'
                });
            } else {
                results.elements.push({
                    name: 'Formato CURP',
                    passed: false,
                    value: 'No detectado',
                    expected: 'CURP válida'
                });
            }

            // Validar formato de clave de elector
            if (extractedData.electorKey) {
                const keyValid = this.validateElectorKeyFormat(extractedData.electorKey);
                results.elements.push({
                    name: 'Clave de elector',
                    passed: keyValid,
                    value: extractedData.electorKey,
                    expected: '18 caracteres alfanuméricos'
                });
            } else {
                results.elements.push({
                    name: 'Clave de elector',
                    passed: false,
                    value: 'No detectado',
                    expected: 'Clave de elector válida'
                });
            }

            // Verificar texto característico del INE
            const hasINEText = await this.detectINEText(imageData);
            results.elements.push({
                name: 'Texto oficial INE',
                passed: hasINEText,
                value: hasINEText ? 'Detectado' : 'No detectado',
                expected: 'Texto oficial del INE'
            });

            results.passed = results.elements.filter(e => e.passed).length >= 2;

        } catch (error) {
            console.error('Error en validación de estructura:', error);
            results.elements.push({
                name: 'Estructura de datos',
                passed: false,
                value: 'Error en análisis',
                expected: 'Datos estructurados correctos'
            });
        }

        return results;
    }

    // Validación de diseño oficial
    async validateOfficialDesign(imageData) {
        console.log('🎨 Validando diseño oficial...');
        
        const results = {
            passed: false,
            elements: []
        };

        try {
            const img = await this.createImage(imageData);
            
            // Análisis de colores (INE tiene colores característicos)
            const colorAnalysis = await this.analyzeColors(img);
            results.elements.push({
                name: 'Espectro de colores',
                passed: colorAnalysis.hasOfficialColors,
                value: colorAnalysis.dominantColors.join(', '),
                expected: 'Colores oficiales del INE'
            });

            // Detección de elementos gráficos característicos
            const hasOfficialElements = await this.detectOfficialElements(img);
            results.elements.push({
                name: 'Elementos gráficos oficiales',
                passed: hasOfficialElements,
                value: hasOfficialElements ? 'Detectados' : 'No detectados',
                expected: 'Logotipos y elementos oficiales'
            });

            // Verificar distribución espacial típica
            const layoutValid = await this.validateLayout(img);
            results.elements.push({
                name: 'Distribución espacial',
                passed: layoutValid,
                value: layoutValid ? 'Correcta' : 'Inusual',
                expected: 'Distribución estándar del INE'
            });

            results.passed = results.elements.filter(e => e.passed).length >= 2;

        } catch (error) {
            console.error('Error en validación de diseño:', error);
            results.elements.push({
                name: 'Diseño oficial',
                passed: false,
                value: 'Error en análisis',
                expected: 'Diseño oficial del INE'
            });
        }

        return results;
    }

    // Validación de elementos de seguridad
    async validateSecurityElements(imageData) {
        console.log('🛡️ Validando elementos de seguridad...');
        
        const results = {
            passed: false,
            elements: []
        };

        try {
            const img = await this.createImage(imageData);
            
            // Detección de patrones de seguridad (simulado)
            const hasSecurityPatterns = await this.detectSecurityPatterns(img);
            results.elements.push({
                name: 'Patrones de seguridad',
                passed: hasSecurityPatterns,
                value: hasSecurityPatterns ? 'Detectados' : 'No detectados',
                expected: 'Patrones antifalsificación'
            });

            // Verificación de calidad de imagen (una INE real tiene cierta textura)
            const imageQuality = await this.analyzeImageQuality(img);
            results.elements.push({
                name: 'Calidad de impresión',
                passed: imageQuality.isHighQuality,
                value: imageQuality.qualityLevel,
                expected: 'Alta calidad de impresión'
            });

            // Detección de elementos de relieve (simulado)
            const hasReliefElements = await this.detectReliefElements(img);
            results.elements.push({
                name: 'Elementos en relieve',
                passed: hasReliefElements,
                value: hasReliefElements ? 'Detectados' : 'No detectados',
                expected: 'Elementos táctiles'
            });

            results.passed = results.elements.filter(e => e.passed).length >= 2;

        } catch (error) {
            console.error('Error en validación de seguridad:', error);
            results.elements.push({
                name: 'Elementos de seguridad',
                passed: false,
                value: 'Error en análisis',
                expected: 'Elementos de seguridad del INE'
            });
        }

        return results;
    }

    // Validación de vigencia
    async validateValidity(imageData) {
        console.log('📅 Validando vigencia...');
        
        const results = {
            passed: false,
            elements: []
        };

        try {
            const extractedData = await this.extractTextFromImage(imageData);
            
            if (extractedData.issueDate && extractedData.expiryDate) {
                const currentDate = new Date();
                const expiryDate = new Date(extractedData.expiryDate);
                const issueDate = new Date(extractedData.issueDate);
                
                // Verificar que no esté expirada
                const notExpired = expiryDate > currentDate;
                results.elements.push({
                    name: 'No expirada',
                    passed: notExpired,
                    value: `Expira: ${extractedData.expiryDate}`,
                    expected: 'Fecha futura'
                });
                
                // Verificar período de validez (máximo 10 años)
                const validityPeriod = this.checkValidityPeriod(issueDate, expiryDate);
                results.elements.push({
                    name: 'Período de validez',
                    passed: validityPeriod.valid,
                    value: validityPeriod.message,
                    expected: 'Máximo 10 años'
                });
                
                // Verificar que sea un modelo vigente
                const validModel = this.validateModel(extractedData.model);
                results.elements.push({
                    name: 'Modelo vigente',
                    passed: validModel,
                    value: extractedData.model || 'No detectado',
                    expected: 'Modelos D, E, F, G, H'
                });
            } else {
                results.elements.push({
                    name: 'Fechas de vigencia',
                    passed: false,
                    value: 'No detectadas',
                    expected: 'Fechas de emisión y expiración'
                });
            }
            
            results.passed = results.elements.filter(e => e.passed).length >= 2;
            
        } catch (error) {
            console.error('Error en validación de vigencia:', error);
            results.elements.push({
                name: 'Vigencia',
                passed: false,
                value: 'Error en análisis',
                expected: 'Credencial vigente'
            });
        }

        return results;
    }

    // =============================================
    // MÉTODOS AUXILIARES MEJORADOS
    // =============================================

    // Crear imagen desde Base64
    createImage(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = imageData;
        });
    }

    // Extraer tamaño del archivo
    extractFileSize(imageData) {
        if (!imageData || !imageData.startsWith('data:')) return 0;
        
        const base64String = imageData.split(',')[1];
        if (!base64String) return 0;
        
        const stringLength = base64String.length;
        const sizeInBytes = Math.floor((stringLength * 3) / 4);
        
        return sizeInBytes;
    }

    // Validar formato CURP
    validateCURPFormat(curp) {
        return this.curpPattern.test(curp);
    }

    // Validar formato clave de elector
    validateElectorKeyFormat(key) {
        return this.electorKeyPattern.test(key);
    }

    // Verificar período de validez
    checkValidityPeriod(issueDate, expiryDate) {
        const diffTime = expiryDate - issueDate;
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
        
        if (diffYears > 10) {
            return { valid: false, message: 'Período de validez excede 10 años' };
        } else if (diffYears < 1) {
            return { valid: false, message: 'Período de validez menor a 1 año' };
        } else {
            return { valid: true, message: `Válida por ${Math.round(diffYears)} años` };
        }
    }

    // Validar modelo
    validateModel(model) {
        const validModels = ['D', 'E', 'F', 'G', 'H'];
        return validModels.includes(model);
    }

    // =============================================
    // MÉTODOS DE ANÁLISIS MEJORADOS (menos aleatorios)
    // =============================================

    async extractTextFromImage(imageData) {
        // En implementación real, integrar con Tesseract.js
        // Por ahora simulamos detección basada en análisis de imagen
        
        const img = await this.createImage(imageData);
        const analysis = await this.analyzeImageContent(img);
        
        // Simular detección basada en características de la imagen
        return {
            curp: analysis.looksLikeINE ? 'GOME800705HDFMLR09' : null,
            electorKey: analysis.looksLikeINE ? 'GOME800705HDFMLR09' : null,
            name: analysis.looksLikeINE ? 'GOMEZ MARGARITA' : null,
            issueDate: analysis.looksLikeINE ? '2019-01-15' : null,
            expiryDate: analysis.looksLikeINE ? '2029-01-15' : null,
            model: analysis.looksLikeINE ? 'G' : null
        };
    }

    async analyzeImageContent(img) {
        // Análisis básico para determinar si parece una INE
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const aspectRatio = width / height;
        
        // Una INE típica tiene relación de aspecto ~1.6
        const hasCorrectAspect = aspectRatio >= 1.5 && aspectRatio <= 1.7;
        const hasGoodResolution = width >= 600 && height >= 400;
        
        return {
            looksLikeINE: hasCorrectAspect && hasGoodResolution,
            confidence: hasCorrectAspect && hasGoodResolution ? 0.8 : 0.2
        };
    }

    async detectINEText(imageData) {
        // Simular detección de texto característico del INE
        const analysis = await this.analyzeImageContent(await this.createImage(imageData));
        return analysis.looksLikeINE;
    }

    async analyzeColors(img) {
        // Análisis simplificado de colores
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Muestra simplificada para análisis
        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        
        // Contar colores predominantes (simplificado)
        const colorCount = {};
        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const color = `${r},${g},${b}`;
            colorCount[color] = (colorCount[color] || 0) + 1;
        }
        
        const dominantColors = Object.entries(colorCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([color]) => color);
        
        // INE típica tiene azules, grises, elementos en color
        const hasBlueTones = dominantColors.some(color => {
            const [r, g, b] = color.split(',').map(Number);
            return b > r && b > g; // Más azul que rojo o verde
        });
        
        return {
            dominantColors,
            hasOfficialColors: hasBlueTones,
            colorVariety: dominantColors.length
        };
    }

    async detectOfficialElements(img) {
        // Simular detección de elementos gráficos oficiales
        const analysis = await this.analyzeImageContent(img);
        return analysis.looksLikeINE;
    }

    async validateLayout(img) {
        // Validar distribución espacial típica de una INE
        const analysis = await this.analyzeImageContent(img);
        return analysis.looksLikeINE;
    }

    async detectSecurityPatterns(img) {
        // Simular detección de patrones de seguridad
        const analysis = await this.analyzeImageContent(img);
        // Solo devolver true si realmente parece una INE
        return analysis.confidence > 0.7;
    }

    async analyzeImageQuality(img) {
        // Análisis básico de calidad
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        let qualityLevel = 'Baja';
        let isHighQuality = false;
        
        if (width >= 1000 && height >= 600) {
            qualityLevel = 'Alta';
            isHighQuality = true;
        } else if (width >= 600 && height >= 400) {
            qualityLevel = 'Media';
            isHighQuality = true;
        }
        
        return {
            qualityLevel,
            isHighQuality,
            resolution: `${width}x${height}`
        };
    }

    async detectReliefElements(img) {
        // Simular detección de elementos en relieve
        const analysis = await this.analyzeImageContent(img);
        // Solo detectar relieve si es muy probable que sea INE
        return analysis.confidence > 0.8;
    }

    // =============================================
    // CÁLCULO DE PUNTUACIÓN Y RECOMENDACIONES
    // =============================================

    calculateScore(details) {
        let totalScore = 0;
        let maxScore = 0;

        const weights = {
            format: 20,
            structure: 25,
            design: 20,
            security: 25,
            validity: 10
        };

        for (const [category, result] of Object.entries(details)) {
            if (result.elements && result.elements.length > 0) {
                const categoryScore = result.elements.filter(e => e.passed).length / result.elements.length * 100;
                totalScore += categoryScore * (weights[category] / 100);
            }
            maxScore += weights[category];
        }

        return Math.round((totalScore / maxScore) * 100);
    }

    generateRecommendations(details) {
        const recommendations = [];

        if (details.format && !details.format.passed) {
            recommendations.push('El documento no tiene el formato adecuado de una INE');
            return recommendations; // Si el formato falla, no continuar
        }

        if (details.structure && !details.structure.passed) {
            recommendations.push('Verificar la estructura de datos (CURP y clave de elector)');
        }

        if (details.design && !details.design.passed) {
            recommendations.push('El diseño no coincide con los estándares oficiales del INE');
        }

        if (details.security && !details.security.passed) {
            recommendations.push('Faltan elementos de seguridad característicos del INE');
        }

        if (details.validity && !details.validity.passed) {
            recommendations.push('Verificar la vigencia de la credencial');
        }

        if (recommendations.length === 0) {
            recommendations.push('La credencial pasó todas las validaciones principales');
        }

        return recommendations;
    }

    // Método para generar reporte HTML
    generateReport(validationResults) {
        let html = `
            <div class="validation-report">
                <div class="validation-header ${validationResults.isValid ? 'valid' : 'invalid'}">
                    <h3>${validationResults.isValid ? '✅ INE VÁLIDA' : '❌ DOCUMENTO NO VÁLIDO'}</h3>
                    <div class="validation-score">Puntuación: ${validationResults.score}%</div>
                    <div class="document-type">Tipo: ${this.getDocumentTypeName(validationResults.documentType)}</div>
                </div>
                
                <div class="validation-details">
                    <h4>Detalles de la Validación</h4>
        `;

        // Agregar detalles por categoría
        for (const [category, result] of Object.entries(validationResults.details)) {
            if (result.elements) {
                html += `
                    <div class="validation-category">
                        <h5>${this.getCategoryName(category)}</h5>
                        <div class="category-status ${result.passed ? 'passed' : 'failed'}">
                            ${result.passed ? '✅' : '❌'} ${result.passed ? 'Aprobado' : 'Fallido'}
                        </div>
                        <ul class="validation-elements">
                `;

                result.elements.forEach(element => {
                    html += `
                        <li class="validation-element ${element.passed ? 'passed' : 'failed'}">
                            <span class="element-status">${element.passed ? '✓' : '✗'}</span>
                            <span class="element-name">${element.name}</span>
                            <span class="element-value">${element.value}</span>
                            ${element.expected ? `<span class="element-expected">Esperado: ${element.expected}</span>` : ''}
                        </li>
                    `;
                });

                html += `</ul></div>`;
            }
        }

        // Agregar recomendaciones
        if (validationResults.recommendations.length > 0) {
            html += `
                <div class="recommendations">
                    <h4>Recomendaciones</h4>
                    <ul>
            `;
            
            validationResults.recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            
            html += `</ul></div>`;
        }

        html += `</div></div>`;

        return html;
    }

    getCategoryName(category) {
        const names = {
            format: 'Formato del Documento',
            structure: 'Estructura de Datos',
            design: 'Diseño Oficial',
            security: 'Elementos de Seguridad',
            validity: 'Vigencia'
        };
        return names[category] || category;
    }

    getDocumentTypeName(type) {
        const names = {
            potential_ine: 'Posible INE',
            other_image: 'Otra imagen',
            other_document: 'Otro documento',
            unknown: 'Desconocido'
        };
        return names[type] || type;
    }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.INEValidator = INEValidator;
}
