import { Response } from 'express';
import { AuthenticatedRequest, IPortfolioClient } from '../types';
import Portfolio from '../models/portfolio';

interface CreatePortfolioBody {
  title: string;
  description?: string;
}

interface UpdatePortfolioBody {
  title?: string;
  description?: string;
}

interface CreateClientBody {
  projectTitle: string;
  servicesProvided: string[];
  projectDuration: string;
  projectStatus: 'Completed' | 'In Progress' | 'On Hold' | 'Cancelled';
  projectDescription: string;
  startDate?: string;
  endDate?: string;
  clientName?: string;
  budget?: number;
  images?: string[];
}

interface UpdateClientBody {
  projectTitle?: string;
  servicesProvided?: string[];
  projectDuration?: string;
  projectStatus?: 'Completed' | 'In Progress' | 'On Hold' | 'Cancelled';
  projectDescription?: string;
  startDate?: string;
  endDate?: string;
  clientName?: string;
  budget?: number;
  images?: string[];
}

export const createPortfolio = async (req: AuthenticatedRequest<{}, {}, CreatePortfolioBody>, res: Response): Promise<void> => {
  try {
    const { title, description } = req.body;
    const serviceProviderId = req.user?.id;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!title) {
      res.status(400).json({ message: 'Title is required' });
      return;
    }

    const newPortfolio = new Portfolio({
      serviceProviderId,
      title,
      description,
      clients: []
    });

    await newPortfolio.save();

    res.status(201).json({
      message: 'Portfolio created successfully',
      data: newPortfolio
    });
  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getPortfolios = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const serviceProviderId = req.user?.id;
    const { page = '1', limit = '10' } = req.query;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const portfolios = await Portfolio.find({ serviceProviderId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Portfolio.countDocuments({ serviceProviderId });

    res.json({
      message: 'Portfolios retrieved successfully',
      data: portfolios,
      pagination: {
        current: pageNum,
        total: Math.ceil(total / limitNum),
        count: portfolios.length,
        totalPortfolios: total
      }
    });
  } catch (error) {
    console.error('Get portfolios error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getPortfolioById = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceProviderId = req.user?.id;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const portfolio = await Portfolio.findOne({ _id: id, serviceProviderId });

    if (!portfolio) {
      res.status(404).json({ message: 'Portfolio not found' });
      return;
    }

    res.json({
      message: 'Portfolio retrieved successfully',
      data: portfolio
    });
  } catch (error) {
    console.error('Get portfolio by ID error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updatePortfolio = async (req: AuthenticatedRequest<{ id: string }, {}, UpdatePortfolioBody>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceProviderId = req.user?.id;
    const updateData = req.body;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const updatedPortfolio = await Portfolio.findOneAndUpdate(
      { _id: id, serviceProviderId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedPortfolio) {
      res.status(404).json({ message: 'Portfolio not found' });
      return;
    }

    res.json({
      message: 'Portfolio updated successfully',
      data: updatedPortfolio
    });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deletePortfolio = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceProviderId = req.user?.id;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const deletedPortfolio = await Portfolio.findOneAndDelete({ _id: id, serviceProviderId });

    if (!deletedPortfolio) {
      res.status(404).json({ message: 'Portfolio not found' });
      return;
    }

    res.json({
      message: 'Portfolio deleted successfully',
      data: deletedPortfolio
    });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Client management within portfolios
export const addClient = async (req: AuthenticatedRequest<{ portfolioId: string }, {}, CreateClientBody>, res: Response): Promise<void> => {
  try {
    const { portfolioId } = req.params;
    const serviceProviderId = req.user?.id;
    const clientData = req.body;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!clientData.projectTitle || !clientData.servicesProvided || !clientData.projectDuration || !clientData.projectStatus || !clientData.projectDescription) {
      res.status(400).json({ message: 'Project title, services provided, duration, status, and description are required' });
      return;
    }

    const clientToAdd: IPortfolioClient = {
      projectTitle: clientData.projectTitle,
      servicesProvided: clientData.servicesProvided,
      projectDuration: clientData.projectDuration,
      projectStatus: clientData.projectStatus,
      projectDescription: clientData.projectDescription,
      startDate: clientData.startDate ? new Date(clientData.startDate) : undefined,
      endDate: clientData.endDate ? new Date(clientData.endDate) : undefined,
      clientName: clientData.clientName,
      budget: clientData.budget,
      images: clientData.images || []
    };

    const updatedPortfolio = await Portfolio.findOneAndUpdate(
      { _id: portfolioId, serviceProviderId },
      { $push: { clients: clientToAdd } },
      { new: true, runValidators: true }
    );

    if (!updatedPortfolio) {
      res.status(404).json({ message: 'Portfolio not found' });
      return;
    }

    res.status(201).json({
      message: 'Client added successfully',
      data: updatedPortfolio
    });
  } catch (error) {
    console.error('Add client error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateClient = async (req: AuthenticatedRequest<{ portfolioId: string; clientId: string }, {}, UpdateClientBody>, res: Response): Promise<void> => {
  try {
    const { portfolioId, clientId } = req.params;
    const serviceProviderId = req.user?.id;
    const updateData = req.body;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const updateFields: any = {};
    Object.keys(updateData).forEach(key => {
      if (key === 'startDate' || key === 'endDate') {
        updateFields[`clients.$.${key}`] = updateData[key as keyof UpdateClientBody] ? new Date(updateData[key as keyof UpdateClientBody] as string) : undefined;
      } else {
        updateFields[`clients.$.${key}`] = updateData[key as keyof UpdateClientBody];
      }
    });

    const updatedPortfolio = await Portfolio.findOneAndUpdate(
      { _id: portfolioId, serviceProviderId, 'clients._id': clientId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedPortfolio) {
      res.status(404).json({ message: 'Portfolio or client not found' });
      return;
    }

    res.json({
      message: 'Client updated successfully',
      data: updatedPortfolio
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const removeClient = async (req: AuthenticatedRequest<{ portfolioId: string; clientId: string }>, res: Response): Promise<void> => {
  try {
    const { portfolioId, clientId } = req.params;
    const serviceProviderId = req.user?.id;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const updatedPortfolio = await Portfolio.findOneAndUpdate(
      { _id: portfolioId, serviceProviderId },
      { $pull: { clients: { _id: clientId } } },
      { new: true }
    );

    if (!updatedPortfolio) {
      res.status(404).json({ message: 'Portfolio not found' });
      return;
    }

    res.json({
      message: 'Client removed successfully',
      data: updatedPortfolio
    });
  } catch (error) {
    console.error('Remove client error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getPortfolioStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const serviceProviderId = req.user?.id;

    if (!serviceProviderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const portfolios = await Portfolio.find({ serviceProviderId });
    
    let totalClients = 0;
    let completedProjects = 0;
    let inProgressProjects = 0;
    let onHoldProjects = 0;
    let cancelledProjects = 0;
    let totalBudget = 0;

    portfolios.forEach(portfolio => {
      portfolio.clients.forEach(client => {
        totalClients++;
        if (client.budget) totalBudget += client.budget;
        
        switch (client.projectStatus) {
          case 'Completed':
            completedProjects++;
            break;
          case 'In Progress':
            inProgressProjects++;
            break;
          case 'On Hold':
            onHoldProjects++;
            break;
          case 'Cancelled':
            cancelledProjects++;
            break;
        }
      });
    });

    res.json({
      message: 'Portfolio statistics retrieved successfully',
      data: {
        totalPortfolios: portfolios.length,
        totalClients,
        totalBudget,
        projectStats: {
          completed: completedProjects,
          inProgress: inProgressProjects,
          onHold: onHoldProjects,
          cancelled: cancelledProjects
        }
      }
    });
  } catch (error) {
    console.error('Get portfolio stats error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 