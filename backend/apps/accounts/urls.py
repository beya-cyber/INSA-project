from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.NDSIRTokenObtainPairView.as_view(), name='login'),
    path('register/citizen/', views.CitizenRegisterView.as_view(), name='register-citizen'),
    path('provision/staff/', views.StaffProvisioningView.as_view(), name='provision-staff'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<uuid:user_id>/suspend/', views.UserSuspendView.as_view(), name='user-suspend'),
    path('me/', views.MyProfileView.as_view(), name='my-profile'),
    path('mfa/enroll/', views.MFAEnrollView.as_view(), name='mfa-enroll'),
    path('mfa/confirm/', views.MFAConfirmView.as_view(), name='mfa-confirm'),
    path('password-reset/request/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
