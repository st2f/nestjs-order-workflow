import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type {
  CreateOrderDto,
  CreateOrderResponseDto,
} from './dto/create-order.dto';
import { CreateOrderService } from './application/create-order.service';
import type { Order } from './entities/order.entity';

@Controller('orders')
export class OrdersController {
  constructor(private readonly createOrderService: CreateOrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateOrderDto,
    @Headers('x-correlation-id') correlationId?: string,
  ): Promise<CreateOrderResponseDto> {
    const order = await this.createOrderService.create({
      ...body,
      correlationId,
    });

    return this.toResponse(order);
  }

  private toResponse(order: Order): CreateOrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      courseId: order.courseId,
      amount: order.amount,
      status: order.status,
    };
  }
}
