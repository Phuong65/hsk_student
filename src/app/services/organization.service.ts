import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { Organization } from '@app/models/organization';
import { IctuDropdownOption } from '@app/models/ictu-dropdown-option';

export interface OrganizationSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class OrganizationService extends IctuBaseServiceClass<Organization> {
    constructor() {
        super('organizations');
    }

    load(donvi_id: number,
        info: OrganizationSearchInfo,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<Organization[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                order: 'DESC',
                orderby: 'created_at',
                include: donvi_id,
                include_by: 'donvi_id'
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        if (info.search) {
            conditions.push(
                {
                    conditionName: 'name',
                    value: info.search.toString(),
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
            );
        }
        return this.query(conditions, queryParams);
    }

    loadOption(donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<IctuDropdownOption<number>[]> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: -1,
                order: 'ASC',
                orderby: 'name',
                include: donvi_id,
                include_by: 'donvi_id'
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];

        return this.query(conditions, queryParams).pipe(
            map(
                ({
                    data
                }: DtoObject<Organization[]>): IctuDropdownOption<number>[] =>
                    data.map(
                        (dvct: Organization): IctuDropdownOption<number> => ({
                            value: dvct.id,
                            label: dvct.name
                        })
                    )
            )
        );
    }

}
