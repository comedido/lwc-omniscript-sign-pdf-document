/**
 * LWC to Sign a PDF Document 
 *
 * @author  Aaron Dominguez - aaron.dominguez@salesforce.com
 * @version 1.0
 *
 * History
 * -------
 * v1.0 - 16/03/2021 - Initial Version
 * 
 */
import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';
import { OmniscriptBaseMixin } from 'vlocity_ins/omniscriptBaseMixin';

export default class SignPdfDocument extends OmniscriptBaseMixin(LightningElement) {
    // Signature Vars
    sigPadInitialized = false;
    canvasWidth = 400;
    canvasHeight = 160;

    // Pdf Vars
    pdfLibInitialized = false;
    result;
    resultFile;
    @api contentVersionData;
    @api get document() {
        return this.contentVersionData;
    }
    set document(val) {
        if (val === null) {
            return    
        }
        this.contentVersionData = val;
    }

    // LWC Lifecycle Hooks
    renderedCallback() {

        if (this.pdfLibInitialized) {
            return;
        }
        this.pdfLibInitialized = true;

        let pdf_lib = "/resource/pdf_lib";
        Promise.all([
            loadScript(this, pdf_lib)
        ])
            .then(() => {
                console.log('pdflib loaded');
            })
            .catch(error => {
                console.log(error);
            });

        if (this.sigPadInitialized) {
            return;
        }
        this.sigPadInitialized = true;

        let signature_pad = "/resource/signature_pad";
        Promise.all([
            loadScript(this, signature_pad)
        ])
            .then(() => {
                this.initialize();
            })
            .catch(error => {
                console.log(error);
            });
    }

    // Init method
    initialize() {
        const canvas = this.template.querySelector('canvas.signature-pad');
        this.signaturePad = new window.SignaturePad(canvas);
    }

    // Funtions
    handleSave() {
        this.result = this.signaturePad.toDataURL();
        this.signPdfDocument();
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success!!',
                message: 'Signature Capture',
                variant: 'success',
            }),
        );
    }

    handleClear() {
        this.signaturePad.clear();
        this.result = "";
        this.resultFile = "";
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Clear',
                message: 'Signature Cleared',
                variant: 'warning',
            }),
        );
    }

    async signPdfDocument() {
        // Load Library
        const { PDFDocument } = window.PDFLib;

        // Fetch drawn signature as a PNG image 
        const pngImageBytes = this.result;

        // Receive the original PDF document as enconded blob
        const existingPdfDocBytes = this.contentVersionData;

        // Load the received PDF into a PDFDocument
        const pdfDoc = await PDFDocument.load(existingPdfDocBytes);

        // Embed PNG image bytes
        const pngImage = await pdfDoc.embedPng(pngImageBytes)

        // Get the width/height of the PNG image scaled down to 50% of its original size
        const pngDims = pngImage.scale(0.5)

        // Add a blank page to the document
        const page = pdfDoc.addPage()

        // Draw the PNG image near the lower right corner of the JPG image
        page.drawImage(pngImage, {
            x: page.getWidth() / 2 - pngDims.width / 2 + 75,
            y: page.getHeight() / 2 - pngDims.height,
            width: pngDims.width,
            height: pngDims.height,
        })

        // Serialize the PDFDocument to bytes (as base64) and generate url
        this.resultFile = await pdfDoc.saveAsBase64({ dataUri: true });

        // Update OmniScript JSON
        this.omniUpdateDataJson(this.resultFile.split(',')[1]);
        
    }
    
}