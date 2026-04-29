import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import * as facturesService from './factures.service';
import { getParam } from '../../lib/helpers';
import { ListFacturesQuery } from './factures.schema';

function money(value: { toString(): string } | number) {
  return `${Number(value.toString()).toFixed(2)} DT`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR');
}

export async function listEtatReglement(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await facturesService.listEtatReglement(req.query as unknown as ListFacturesQuery);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listPartnerFactures(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await facturesService.listPartnerFactures(
      req.user!.userId,
      req.query as unknown as ListFacturesQuery,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateFacturePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await facturesService.updateFacturePayment(getParam(req, 'id'), req.body.amountPaid);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function downloadFacturePdf(req: Request, res: Response, next: NextFunction) {
  try {
    const facture = await facturesService.getFactureForPdf(
      getParam(req, 'id'),
      req.user!.userId,
      req.user!.role,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${facture.reference}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    doc.fontSize(22).text('Facture partenaire', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Référence: ${facture.reference}`, { align: 'right' });
    doc.text(`Date: ${formatDate(facture.generatedAt)}`, { align: 'right' });
    doc.moveDown(1.5);

    doc.fontSize(14).text('Partenaire', { underline: true });
    doc.fontSize(11)
      .text(facture.partner.name)
      .text(`Téléphone: ${facture.partner.phone}`)
      .text(`Ville: ${facture.partner.city}`)
      .text(`Adresse: ${facture.partner.address ?? '-'}`);
    doc.moveDown();

    doc.fontSize(14).text('Réservation', { underline: true });
    doc.fontSize(11)
      .text(`Client: ${facture.reservation.guestName}`)
      .text(`Référence réservation: ${facture.reservation.reference}`)
      .text(`Téléphone client: ${facture.reservation.guestPhone}`)
      .text(`Email client: ${facture.reservation.guestEmail ?? '-'}`)
      .text(`Ressource: ${facture.reservation.resource.name}`)
      .text(`Date: ${formatDate(facture.reservation.date)}`)
      .text(`Créneau: ${facture.reservation.startTime} - ${facture.reservation.endTime}`);
    doc.moveDown(1.5);

    const startY = doc.y;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Description', 50, startY);
    doc.text('Montant', 420, startY, { width: 120, align: 'right' });
    doc.moveTo(50, startY + 18).lineTo(545, startY + 18).stroke();

    doc.font('Helvetica').fontSize(11);
    doc.text('Total réservation client', 50, startY + 32);
    doc.text(money(facture.reservationTotal), 420, startY + 32, { width: 120, align: 'right' });
    doc.text(`Marge plateforme (${Number(facture.commissionPercent).toFixed(2)} %)`, 50, startY + 56);
    doc.text(money(facture.amountDue), 420, startY + 56, { width: 120, align: 'right' });
    doc.text('Montant payé', 50, startY + 80);
    doc.text(money(facture.amountPaid), 420, startY + 80, { width: 120, align: 'right' });
    doc.moveTo(50, startY + 110).lineTo(545, startY + 110).stroke();
    doc.font('Helvetica-Bold');
    doc.text('Reste à payer', 50, startY + 124);
    doc.text(money(facture.amountDue.sub(facture.amountPaid)), 420, startY + 124, { width: 120, align: 'right' });

    doc.moveDown(6);
    doc.font('Helvetica').fontSize(10).fillColor('#666666');
    doc.text('Cette facture est générée automatiquement après le passage de la réservation au statut payée.');

    doc.end();
  } catch (err) {
    next(err);
  }
}
