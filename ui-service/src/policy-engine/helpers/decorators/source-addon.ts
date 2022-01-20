import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces';
import {BasicBlock} from '@policy-engine/helpers/decorators/basic-block';

export function SourceAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'SourceAddon';

            public getFromSource(...args): any[] {
                if (super.getFromSource === 'function') {
                    return super.getFromSource(...args)
                }
                return [];
            }
        }
    }
}