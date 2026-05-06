export type CreateOrderDto = {
  userId: string;
  courseId: string;
  amount: string;
};

export type CreateOrderResponseDto = {
  id: string;
  userId: string;
  courseId: string;
  amount: string;
  status: string;
};
