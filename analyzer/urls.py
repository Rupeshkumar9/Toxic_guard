from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/users/', views.get_all_users, name='users'),
    path('api/users/<int:user_id>/timeline/', views.get_user_timeline, name='user_timeline'),
    path('api/platform-stats/', views.platform_stats, name='platform_stats'),
    path('api/analyze/', views.run_analysis, name='analyze'),
    path('api/upload-csv/', views.upload_csv, name='upload_csv'),
    path('api/datasets/', views.list_datasets, name='datasets'),
]
