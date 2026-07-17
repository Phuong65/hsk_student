import { Component , inject , Signal , viewChild } from '@angular/core';
import { ApexOptions , ChartComponent , NgApexchartsModule } from 'ng-apexcharts';
import { ChartDB } from '@sample/chartDB';
import { CardComponent } from '@theme/components/card/card.component';
import { MatButton } from '@angular/material/button';
import { MatMenu , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTab , MatTabGroup } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { NgTemplateOutlet } from '@angular/common';
import { AppPreviewHeading } from '@pages/preview/preview.component';

@Component( {
    selector    : 'app-chart-table' ,
    imports     : [ CardComponent , ChartComponent , MatButton , MatMenu , MatMenuItem , MatProgressBar , MatTab , MatTabGroup , MatTooltip , NgTemplateOutlet , MatMenuTrigger , NgApexchartsModule ] ,
    templateUrl : './chart-table.component.html' ,
    styleUrl    : './chart-table.component.scss'
} )
export default class ChartTableComponent {

    chart : Signal<ChartComponent | undefined> = viewChild<ChartComponent>( 'chart' );

    earningChart : Partial<ApexOptions>;

    pageViewChart : Partial<ApexOptions>;

    totalTaskChart : Partial<ApexOptions>;

    downloadChart : Partial<ApexOptions>;

    monthlyRevenueChart : Partial<ApexOptions>;

    totalTasksChart : Partial<ApexOptions>;

    pendingTasksChart : Partial<ApexOptions>;

    totalIncomeChart : Partial<ApexOptions>;

    chartDB : any;

    preset : string[] = [ '#4680FF' ];

    monthlyColor : string[] = [ '#4680FF' , '#8996a4' ];

    incomeColors : string[] = [ '#4680FF' , '#E58A00' , '#2CA87F' , '#b5ccff' ];

    project : { title : string }[] = [
        {
            title : 'Invoice Generator'
        } ,
        {
            title : 'Package Upgrades'
        } ,
        {
            title : 'Figma Auto Layout'
        }
    ];
    list_transaction : {
        icon : string,
        name : string,
        tooltip? : string,
        bg? : string,
        time : string,
        amount : string,
        amount_position : string,
        percentage : string,
        amount_type : string,
    }[]                            = [
        {
            icon            : 'AI' ,
            name            : 'Apple Inc.' ,
            time            : '#ABLE-PRO-T00232' ,
            amount          : '$210,000' ,
            amount_position : 'ti ti-arrow-down-left' ,
            percentage      : '10.6%' ,
            amount_type     : 'text-warn-500'
        } ,
        {
            icon            : 'SM' ,
            tooltip         : '10,000 Tracks' ,
            name            : 'Spotify Music' ,
            time            : '#ABLE-PRO-T10232' ,
            amount          : '- 10,000' ,
            amount_position : 'ti ti-arrow-up-right' ,
            percentage      : '30.6%' ,
            amount_type     : 'text-success-500'
        } ,
        {
            icon            : 'MD' ,
            bg              : 'text-primary-500 bg-primary-50' ,
            tooltip         : '143 Posts' ,
            name            : 'Medium' ,
            time            : '06:30 pm' ,
            amount          : '-26' ,
            amount_position : 'ti ti-arrows-left-right' ,
            percentage      : '5%' ,
            amount_type     : 'text-warning-500'
        } ,
        {
            icon            : 'U' ,
            tooltip         : '143 Posts' ,
            name            : 'Uber' ,
            time            : '08:40 pm' ,
            amount          : '+210,000' ,
            amount_position : 'ti ti-arrow-up-right' ,
            percentage      : '10.6%' ,
            amount_type     : 'text-success-500'
        } ,
        {
            icon            : 'OC' ,
            bg              : 'text-warning-500 bg-warning-50' ,
            tooltip         : '143 Posts' ,
            name            : 'Ola Cabs' ,
            time            : '07:40 pm' ,
            amount          : '+210,000' ,
            amount_position : 'ti ti-arrow-up-right' ,
            percentage      : '10.6%' ,
            amount_type     : 'text-success-500'
        }
    ];
    income_card : {
        background : string,
        item : string,
        value : string,
        number : string,
    }[]                            = [
        {
            background : 'bg-primary-500' ,
            item       : 'Income' ,
            value      : '$23,876' ,
            number     : '+$763,43'
        } ,
        {
            background : 'bg-warning-500' ,
            item       : 'Rent' ,
            value      : '$23,876' ,
            number     : '+$763,43'
        } ,
        {
            background : 'bg-success-500' ,
            item       : 'Download' ,
            value      : '$23,876' ,
            number     : '+$763,43'
        } ,
        {
            background : 'bg-primary-200' ,
            item       : 'Views' ,
            value      : '$23,876' ,
            number     : '+$763,43'
        }
    ];

    constructor () {
        inject( AppPreviewHeading ).set( { heading : 'Chart and table' } );
        this.chartDB = ChartDB;

        const { earningChart , totalTaskChart , downloadChart , totalTasksChart , pageViewChart , monthlyRevenueChart , pendingTasksChart , totalIncomeChart } = this.chartDB;

        this.earningChart        = earningChart;
        this.pageViewChart       = pageViewChart;
        this.totalTaskChart      = totalTaskChart;
        this.downloadChart       = downloadChart;
        this.monthlyRevenueChart = monthlyRevenueChart;
        this.totalTasksChart     = totalTasksChart;
        this.pendingTasksChart   = pendingTasksChart;
        this.totalIncomeChart    = totalIncomeChart;
    }
}
