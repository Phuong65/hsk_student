import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component( {
    standalone : true ,
    imports    : [ CommonModule ] ,
    selector   : 'app-dashboard' ,
    template   : `
        <div class="dashboard-container">
            <h2>Dashboard</h2>
            <p>Chào mừng bạn đến với hệ thống quản lý.</p>
        </div>
    ` ,
    styles     : [ `
        .dashboard-container {
            padding: 24px;
        }

        h2 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
        }
    ` ]
} )
export default class DashboardComponent {
}
