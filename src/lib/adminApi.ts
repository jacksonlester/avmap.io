import { FileJsonStore } from './dataStore';
import { AuditLogger } from './auditLogger';
import { AuthService } from './auth';
import { stateForAllDeploymentsAsOf } from './stateEngine';
import { 
  Deployment, 
  Event, 
  ServiceAreaShape, 
  NewsItem, 
  Page, 
  StateApiResponse 
} from '@/types/admin';

class AdminApi {
  private dataStore = new FileJsonStore();

  private requireAuth() {
    const session = AuthService.validateSession();
    if (!session) {
      throw new Error('Authentication required');
    }
    return session;
  }

  private async logAction(entity: string, entityId: string, action: 'create' | 'update' | 'delete' | 'rebuild', message?: string) {
    const session = this.requireAuth();
    await AuditLogger.log({
      entity,
      entityId,
      action,
      actor: session.email,
      message
    });
  }

  // Deployments
  async getDeployments(): Promise<Record<string, Deployment>> {
    return this.dataStore.list<Deployment>('deployments');
  }

  async getDeployment(id: string): Promise<Deployment | null> {
    return this.dataStore.read<Deployment>('deployments', id);
  }

  async saveDeployment(deployment: Deployment): Promise<void> {
    const session = this.requireAuth();
    const isNew = !(await this.dataStore.read('deployments', deployment.id));
    
    await this.dataStore.write('deployments', deployment.id, deployment, session.email);
    await this.logAction(
      'deployments', 
      deployment.id, 
      isNew ? 'create' : 'update',
      `${isNew ? 'Created' : 'Updated'} deployment: ${deployment.operator} - ${deployment.city}`
    );
  }

  async deleteDeployment(id: string): Promise<void> {
    const session = this.requireAuth();
    await this.dataStore.delete('deployments', id, session.email);
    await this.logAction('deployments', id, 'delete', `Deleted deployment: ${id}`);
  }

  // Events
  async getEvents(deploymentId?: string): Promise<Record<string, Event>> {
    const allEvents = await this.dataStore.list<Event>('events');
    
    if (deploymentId) {
      return Object.fromEntries(
        Object.entries(allEvents).filter(([_, event]) => event.deploymentId === deploymentId)
      );
    }
    
    return allEvents;
  }

  async getEvent(id: string): Promise<Event | null> {
    return this.dataStore.read<Event>('events', id);
  }

  async saveEvent(event: Event): Promise<void> {
    const session = this.requireAuth();
    const isNew = !(await this.dataStore.read('events', event.id));
    
    await this.dataStore.write('events', event.id, event, session.email);
    await this.logAction(
      'events', 
      event.id, 
      isNew ? 'create' : 'update',
      `${isNew ? 'Created' : 'Updated'} event: ${event.type} for ${event.deploymentId}`
    );
  }

  async deleteEvent(id: string): Promise<void> {
    const session = this.requireAuth();
    await this.dataStore.delete('events', id, session.email);
    await this.logAction('events', id, 'delete', `Deleted event: ${id}`);
  }

  // Service Area Shapes
  async getServiceAreaShapes(deploymentId?: string): Promise<Record<string, ServiceAreaShape>> {
    const allShapes = await this.dataStore.list<ServiceAreaShape>('service_area_shapes');
    
    if (deploymentId) {
      return Object.fromEntries(
        Object.entries(allShapes).filter(([_, shape]) => shape.deploymentId === deploymentId)
      );
    }
    
    return allShapes;
  }

  async getServiceAreaShape(id: string): Promise<ServiceAreaShape | null> {
    return this.dataStore.read<ServiceAreaShape>('service_area_shapes', id);
  }

  async saveServiceAreaShape(shape: ServiceAreaShape): Promise<void> {
    const session = this.requireAuth();
    const isNew = !(await this.dataStore.read('service_area_shapes', shape.id));
    
    await this.dataStore.write('service_area_shapes', shape.id, shape, session.email);
    await this.logAction(
      'service_area_shapes', 
      shape.id, 
      isNew ? 'create' : 'update',
      `${isNew ? 'Created' : 'Updated'} service area shape: ${shape.id} for ${shape.deploymentId}`
    );
  }

  async deleteServiceAreaShape(id: string): Promise<void> {
    const session = this.requireAuth();
    await this.dataStore.delete('service_area_shapes', id, session.email);
    await this.logAction('service_area_shapes', id, 'delete', `Deleted service area shape: ${id}`);
  }

  // News
  async getNews(): Promise<Record<string, NewsItem>> {
    return this.dataStore.list<NewsItem>('news');
  }

  async getNewsItem(id: string): Promise<NewsItem | null> {
    return this.dataStore.read<NewsItem>('news', id);
  }

  async saveNewsItem(news: NewsItem): Promise<void> {
    const session = this.requireAuth();
    const isNew = !(await this.dataStore.read('news', news.id));
    
    await this.dataStore.write('news', news.id, news, session.email);
    await this.logAction(
      'news', 
      news.id, 
      isNew ? 'create' : 'update',
      `${isNew ? 'Created' : 'Updated'} news article: ${news.title}`
    );
  }

  async deleteNewsItem(id: string): Promise<void> {
    const session = this.requireAuth();
    await this.dataStore.delete('news', id, session.email);
    await this.logAction('news', id, 'delete', `Deleted news article: ${id}`);
  }

  // Pages
  async getPages(): Promise<Record<string, Page>> {
    return this.dataStore.list<Page>('pages');
  }

  async getPage(id: string): Promise<Page | null> {
    return this.dataStore.read<Page>('pages', id);
  }

  async savePage(page: Page): Promise<void> {
    const session = this.requireAuth();
    const isNew = !(await this.dataStore.read('pages', page.id));
    
    await this.dataStore.write('pages', page.id, page, session.email);
    await this.logAction(
      'pages', 
      page.id, 
      isNew ? 'create' : 'update',
      `${isNew ? 'Created' : 'Updated'} page: ${page.title}`
    );
  }

  async deletePage(id: string): Promise<void> {
    const session = this.requireAuth();
    await this.dataStore.delete('pages', id, session.email);
    await this.logAction('pages', id, 'delete', `Deleted page: ${id}`);
  }

  // State API
  async getStateAsOf(asOf: string): Promise<StateApiResponse> {
    const [deployments, events, shapes] = await Promise.all([
      this.getDeployments(),
      this.getEvents(),
      this.getServiceAreaShapes()
    ]);

    const deploymentList = Object.values(deployments);
    const eventList = Object.values(events);
    const shapeList = Object.values(shapes);

    return stateForAllDeploymentsAsOf(deploymentList, eventList, shapeList, asOf).map(state => ({
      ...state,
      riderApps: state.riderApps || []
    }));
  }

  // Build shapes bundle for frontend
  async buildShapesBundle(): Promise<void> {
    const session = this.requireAuth();
    const shapes = await this.getServiceAreaShapes();
    const deployments = await this.getDeployments();

    // Create combined GeoJSON with all shapes
    const features = Object.values(shapes).map(shape => {
      const deployment = deployments[shape.deploymentId];
      
      return shape.geojson.features.map((feature: any) => ({
        ...feature,
        properties: {
          ...feature.properties,
          deploymentId: shape.deploymentId,
          operator: deployment?.operator || 'Unknown',
          validFrom: new Date(shape.validFrom).getTime(),
          validTo: shape.validTo ? new Date(shape.validTo).getTime() : null,
          status: shape.status || 'active',
          city: deployment?.city || '',
          shapeId: shape.id
        }
      }));
    }).flat();

    const bundle = {
      type: 'FeatureCollection',
      features,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: Date.now().toString(),
        totalShapes: Object.keys(shapes).length
      }
    };

    // Save to public directory (in a real app, this would be handled differently)
    await this.dataStore.write('service_areas_all', 'bundle', bundle, session.email);
    
    await this.logAction(
      'system', 
      'shapes_bundle', 
      'rebuild',
      `Rebuilt shapes bundle with ${features.length} features`
    );
  }
}

export const adminApi = new AdminApi();