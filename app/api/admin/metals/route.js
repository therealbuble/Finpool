// app/api/admin/metals/route.js
import metalsUpdateService from '@/lib/services/metalsUpdateService';
import { metalsScraper } from '@/lib/scrapers/getMetals';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return Response.json({
          success: true,
          data: metalsUpdateService.getStatus()
        });

      case 'cache':
        return Response.json({
          success: true,
          data: metalsScraper.getCacheInfo()
        });

      case 'prices':
        const prices = await metalsScraper.getMetalsPrices();
        return Response.json({
          success: true,
          data: { prices }
        });

      default:
        return Response.json({
          success: true,
          data: {
            status: metalsUpdateService.getStatus(),
            availableActions: ['status', 'cache', 'prices']
          }
        });
    }
  } catch (error) {
    console.error('Admin metals API error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { action } = await req.json();

    switch (action) {
      case 'start':
        metalsUpdateService.start();
        return Response.json({
          success: true,
          message: 'Metals update service started'
        });

      case 'stop':
        metalsUpdateService.stop();
        return Response.json({
          success: true,
          message: 'Metals update service stopped'
        });

      case 'restart':
        metalsUpdateService.restart();
        return Response.json({
          success: true,
          message: 'Metals update service restarted'
        });

      case 'update':
        await metalsScraper.forceUpdate();
        return Response.json({
          success: true,
          message: 'Metals prices updated manually'
        });

      default:
        return Response.json({
          success: false,
          error: 'Invalid action. Use: start, stop, restart, or update'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin metals API error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}