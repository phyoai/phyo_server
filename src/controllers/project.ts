import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Project from '../models/project';

interface CreateProjectBody {
  name: string;
  description: string;
  progressPercentage?: number;
  date: string;
  status?: 'Planning' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
}

interface UpdateProjectBody {
  name?: string;
  description?: string;
  progressPercentage?: number;
  date?: string;
  status?: 'Planning' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
}

export const createProject = async (req: AuthenticatedRequest<{}, {}, CreateProjectBody>, res: Response): Promise<void> => {
  try {
    const { name, description, progressPercentage = 0, date, status = 'Planning' } = req.body;
    const serviceProviderId = req.user?.id;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!name || !description || !date) {
      res.status(400).json({ message: 'Name, description, and date are required' });
      return;
    }

    if (progressPercentage < 0 || progressPercentage > 100) {
      res.status(400).json({ message: 'Progress percentage must be between 0 and 100' });
      return;
    }

    const newProject = new Project({
      serviceProviderId,
      name,
      description,
      progressPercentage,
      date: new Date(date),
      status
    });

    await newProject.save();

    res.status(201).json({
      message: 'Project created successfully',
      data: newProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const serviceProviderId = req.user?.id;
    const { status, page = '1', limit = '10' } = req.query;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let filter: any = { serviceProviderId };
    if (status) {
      filter.status = status;
    }

    const projects = await Project.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Project.countDocuments(filter);

    res.json({
      message: 'Projects retrieved successfully',
      data: projects,
      pagination: {
        current: pageNum,
        total: Math.ceil(total / limitNum),
        count: projects.length,
        totalProjects: total
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getProjectById = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceProviderId = req.user?.id;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const project = await Project.findOne({ _id: id, serviceProviderId });

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    res.json({
      message: 'Project retrieved successfully',
      data: project
    });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateProject = async (req: AuthenticatedRequest<{ id: string }, {}, UpdateProjectBody>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceProviderId = req.user?.id;
    const updateData = req.body;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (updateData.progressPercentage !== undefined && (updateData.progressPercentage < 0 || updateData.progressPercentage > 100)) {
      res.status(400).json({ message: 'Progress percentage must be between 0 and 100' });
      return;
    }

    if (updateData.date) {
      updateData.date = new Date(updateData.date) as any;
    }

    const updatedProject = await Project.findOneAndUpdate(
      { _id: id, serviceProviderId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    res.json({
      message: 'Project updated successfully',
      data: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteProject = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceProviderId = req.user?.id;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const deletedProject = await Project.findOneAndDelete({ _id: id, serviceProviderId });

    if (!deletedProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    res.json({
      message: 'Project deleted successfully',
      data: deletedProject
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getProjectStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const serviceProviderId = req.user?.id;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const stats = await Project.aggregate([
      { $match: { serviceProviderId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progressPercentage' }
        }
      }
    ]);

    const totalProjects = await Project.countDocuments({ serviceProviderId });
    const averageProgress = await Project.aggregate([
      { $match: { serviceProviderId } },
      { $group: { _id: null, avgProgress: { $avg: '$progressPercentage' } } }
    ]);

    res.json({
      message: 'Project statistics retrieved successfully',
      data: {
        totalProjects,
        averageProgress: averageProgress[0]?.avgProgress || 0,
        statusBreakdown: stats
      }
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 