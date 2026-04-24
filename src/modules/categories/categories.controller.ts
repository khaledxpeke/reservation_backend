import { Request, Response, NextFunction } from 'express';
import * as categoriesService from './categories.service';
import { getParam } from '../../lib/helpers';

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await categoriesService.listCategories();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await categoriesService.createCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await categoriesService.updateCategory(getParam(req, 'id'), req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await categoriesService.deleteCategory(getParam(req, 'id'));
    res.json({ success: true, data: { message: 'Category deleted' } });
  } catch (err) {
    next(err);
  }
}

export async function addSubCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await categoriesService.addSubCategory(getParam(req, 'id'), req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateSubCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await categoriesService.updateSubCategory(getParam(req, 'id'), req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteSubCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await categoriesService.deleteSubCategory(getParam(req, 'id'));
    res.json({ success: true, data: { message: 'SubCategory deleted' } });
  } catch (err) {
    next(err);
  }
}

