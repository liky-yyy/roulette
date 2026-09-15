type ModernDecoratorContext = {
  name: string | symbol;
  addInitializer(initializer: (this: any) => void): void;
};

export function bound<T extends Function>(method: T, context: ModernDecoratorContext): void;
export function bound<T extends Function>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T>;
export function bound<T extends Function>(
  targetOrMethod: any,
  propertyKeyOrContext: string | ModernDecoratorContext,
  descriptor?: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> | undefined {
  if (typeof propertyKeyOrContext === 'object') {
    const method = targetOrMethod as T;
    const context = propertyKeyOrContext;
    context.addInitializer(function (this: any) {
      this[context.name] = method.bind(this);
    });
    return;
  }

  const propertyKey = propertyKeyOrContext;
  return {
    configurable: true,
    get(this: T): T {
      const boundMethod = descriptor?.value?.bind(this);
      Object.defineProperty(this, propertyKey, {
        value: boundMethod,
        configurable: true,
        writable: true,
      });
      return boundMethod;
    },
  };
}
