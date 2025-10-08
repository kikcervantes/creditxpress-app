// ine-validator.js - Módulo de validación de INE
class INEValidator {
    constructor() {
        this.validationSteps = [
            { id: 'structure', name: 'Estructura de datos', description: 'Validación de CURP y clave de elector' },
            { id: 'visible', name: 'Elementos visibles', description: 'Microtexto, OVD, tinta UV' },
            { id: 'secondLevel', name: 'Elementos de segundo nivel', description: 'Elementos que requieren lupa' },
            { id: 'nonVisible', name: 'Elementos no visibles', description: 'Elementos con luz UV' },
            { id: 'qr', name: 'Códigos QR', description: 'Validación de códigos QR y contenido' },
            { id: 'validity', name: 'Vigencia', description: 'Verificación de vigencia de la credencial' }
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
            fileSize: this.extractFileSize(imageData)
        };

        try {
            // 1. Análisis de estructura de datos
            const structureResult = await this.validateStructure(imageData);
            results.details.structure = structureResult;
            
            // 2. Detección de elementos de seguridad visibles
            const visibleResult = await this.validateVisibleElements(imageData);
            results.details.visible = visibleResult;
            
            // 3. Verificación de elementos de segundo nivel
            const secondLevelResult = await this.validateSecondLevelElements(imageData);
            results.details.secondLevel = secondLevelResult;
            
            // 4. Validación de códigos QR
            const qrResult = await this.validateQRCodes(imageData);
            results.details.qr = qrResult;
            
            // 5. Verificación de vigencia
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

    // Validación de estructura de datos (CURP, clave de elector)
    async validateStructure(imageData) {
        console.log('📊 Validando estructura de datos...');
        
        // En una implementación real, aquí usarías OCR para extraer texto
        const extractedData = await this.extractTextFromImage(imageData);
        
        const results = {
            passed: false,
            details: {},
            elements: []
        };

        // Validar formato de CURP
        if (extractedData.curp) {
            const curpValid = this.validateCURP(extractedData.curp);
            results.elements.push({
                name: 'CURP',
                passed: curpValid,
                value: extractedData.curp
            });
        }

        // Validar formato de clave de elector
        if (extractedData.electorKey) {
            const keyValid = this.validateElectorKey(extractedData.electorKey);
            results.elements.push({
                name: 'Clave de Elector',
                passed: keyValid,
                value: extractedData.electorKey
            });
        }

        // Validar consistencia de datos
        const dataConsistent = this.validateDataConsistency(extractedData);
        results.elements.push({
            name: 'Consistencia de datos',
            passed: dataConsistent
        });

        results.passed = results.elements.filter(e => e.passed).length >= 2;
        return results;
    }

    // Validación de elementos visibles
    async validateVisibleElements(imageData) {
        console.log('👁️ Validando elementos visibles...');
        
        const results = {
            passed: false,
            elements: []
        };

        // Simular detección de elementos (en implementación real usarías procesamiento de imagen)
        const elementsToCheck = [
            { name: 'Microtexto INE', method: 'detectMicrotext' },
            { name: 'Elementos OVD/OVI', method: 'detectOVD' },
            { name: 'Tintas UV', method: 'detectUVInk' },
            { name: 'Relieve táctil', method: 'detectRelief' },
            { name: 'Fondo de seguridad', method: 'detectSecurityBackground' }
        ];

        for (const element of elementsToCheck) {
            const detected = await this[element.method](imageData);
            results.elements.push({
                name: element.name,
                passed: detected,
                confidence: detected ? Math.random() * 30 + 70 : Math.random() * 30 // 70-100% si detectado, 0-30% si no
            });
        }

        results.passed = results.elements.filter(e => e.passed).length >= 3;
        return results;
    }

    // Validación de elementos de segundo nivel (requieren lupa)
    async validateSecondLevelElements(imageData) {
        console.log('🔎 Validando elementos de segundo nivel...');
        
        const results = {
            passed: false,
            elements: []
        };

        const secondLevelElements = [
            { name: 'Microtexto en bordes', method: 'detectEdgeMicrotext' },
            { name: 'Patrones de líneas finas', method: 'detectFineLinePatterns' },
            { name: 'Impresión arcoíris', method: 'detectRainbowPrint' }
        ];

        for (const element of secondLevelElements) {
            const detected = await this[element.method](imageData);
            results.elements.push({
                name: element.name,
                passed: detected,
                confidence: detected ? Math.random() * 25 + 75 : Math.random() * 25
            });
        }

        results.passed = results.elements.filter(e => e.passed).length >= 2;
        return results;
    }

    // Validación de códigos QR
    async validateQRCodes(imageData) {
        console.log('📱 Validando códigos QR...');
        
        const results = {
            passed: false,
            elements: []
        };

        try {
            // Detectar y decodificar QR
            const qrData = await this.decodeQRCode(imageData);
            
            if (qrData) {
                // Validar estructura del QR
                const qrStructureValid = this.validateQRStructure(qrData);
                results.elements.push({
                    name: 'Estructura QR',
                    passed: qrStructureValid,
                    data: qrData.substring(0, 50) + '...'
                });

                // Validar firma digital (si existe)
                const digitalSignatureValid = await this.validateDigitalSignature(qrData);
                results.elements.push({
                    name: 'Firma digital',
                    passed: digitalSignatureValid
                });

                // Verificar consistencia con datos visibles
                const consistencyValid = await this.verifyQRConsistency(qrData, imageData);
                results.elements.push({
                    name: 'Consistencia datos',
                    passed: consistencyValid
                });
            }

            results.passed = results.elements.length > 0 && 
                           results.elements.filter(e => e.passed).length >= 2;
            
        } catch (error) {
            console.error('Error en validación QR:', error);
            results.error = error.message;
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
                    value: `Expira: ${extractedData.expiryDate}`
                });
                
                // Verificar que sea un modelo vigente
                const validModel = this.validateModel(extractedData.model);
                results.elements.push({
                    name: 'Modelo vigente',
                    passed: validModel,
                    value: extractedData.model || 'No detectado'
                });
                
                // Verificar período de validez
                const validityPeriod = this.checkValidityPeriod(issueDate, expiryDate);
                results.elements.push({
                    name: 'Período de validez',
                    passed: validityPeriod.valid,
                    value: validityPeriod.message
                });
            }
            
            results.passed = results.elements.filter(e => e.passed).length >= 2;
            
        } catch (error) {
            console.error('Error en validación de vigencia:', error);
        }

        return results;
    }

    // Métodos auxiliares (simulados para el ejemplo)
    async extractTextFromImage(imageData) {
        // En implementación real: usar Tesseract.js o similar para OCR
        return {
            curp: 'GOME800705HDFMLR09',
            electorKey: 'GOME800705HDFMLR09',
            name: 'GOMEZ MARGARITA',
            issueDate: '2019-01-15',
            expiryDate: '2029-01-15',
            model: 'G'
        };
    }

    extractFileSize(imageData) {
        // Calcular tamaño aproximado del archivo desde Base64
        if (!imageData || !imageData.startsWith('data:')) return 0;
        
        const base64String = imageData.split(',')[1];
        if (!base64String) return 0;
        
        // Tamaño en bytes = (longitud_base64 * 3) / 4 - padding
        const stringLength = base64String.length;
        const sizeInBytes = Math.floor((stringLength * 3) / 4);
        
        return sizeInBytes;
    }

    validateCURP(curp) {
        // Validación básica de formato CURP
        const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/;
        return curpRegex.test(curp);
    }

    validateElectorKey(key) {
        // Validación básica de formato de clave de elector
        return key && key.length >= 18;
    }

    validateDataConsistency(data) {
        // Verificar que los datos sean consistentes entre sí
        return data.curp && data.electorKey && data.name;
    }

    // Métodos de detección simulados
    async detectMicrotext(imageData) { return Math.random() > 0.3; }
    async detectOVD(imageData) { return Math.random() > 0.4; }
    async detectUVInk(imageData) { return Math.random() > 0.5; }
    async detectRelief(imageData) { return Math.random() > 0.6; }
    async detectSecurityBackground(imageData) { return Math.random() > 0.4; }
    async detectEdgeMicrotext(imageData) { return Math.random() > 0.3; }
    async detectFineLinePatterns(imageData) { return Math.random() > 0.4; }
    async detectRainbowPrint(imageData) { return Math.random() > 0.5; }

    async decodeQRCode(imageData) {
        // Simular decodificación de QR
        return Math.random() > 0.2 ? 'IDMEX18365777170<<07471163758428007057M2212315MEX<02<<12345<<7GOMEZ<VELAZQUEZ<<MARGARITA<<<<' : null;
    }

    validateQRStructure(qrData) {
        return qrData && qrData.length > 50;
    }

    async validateDigitalSignature(qrData) {
        return Math.random() > 0.3;
    }

    async verifyQRConsistency(qrData, imageData) {
        return Math.random() > 0.4;
    }

    validateModel(model) {
        // Modelos vigentes según documento INE
        const validModels = ['D', 'E', 'F', 'G', 'H'];
        return validModels.includes(model);
    }

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

    // Cálculo de puntuación
    calculateScore(details) {
        let totalScore = 0;
        let maxScore = 0;

        const weights = {
            structure: 25,
            visible: 25,
            secondLevel: 20,
            qr: 20,
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

    // Generar recomendaciones
    generateRecommendations(details) {
        const recommendations = [];

        if (details.structure && !details.structure.passed) {
            recommendations.push('Verificar la estructura de CURP y clave de elector');
        }

        if (details.visible && details.visible.elements) {
            const failedVisible = details.visible.elements.filter(e => !e.passed);
            if (failedVisible.length > 2) {
                recommendations.push('Múltiples elementos de seguridad visibles no detectados');
            }
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
                    <h3>${validationResults.isValid ? '✅ INE VÁLIDA' : '❌ INE NO VÁLIDA'}</h3>
                    <div class="validation-score">Puntuación: ${validationResults.score}%</div>
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
                            ${element.value ? `<span class="element-value">${element.value}</span>` : ''}
                            ${element.confidence ? `<span class="element-confidence">${Math.round(element.confidence)}%</span>` : ''}
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
            structure: 'Estructura de Datos',
            visible: 'Elementos Visibles',
            secondLevel: 'Elementos de Segundo Nivel',
            qr: 'Códigos QR',
            validity: 'Vigencia'
        };
        return names[category] || category;
    }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.INEValidator = INEValidator;
}
